import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateUserSettingsAction } from "@/app/settings/actions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSettings: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("User Settings Server Action - (TDD)", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error if no active session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("quotaLimitGb", "10");
    formData.append("autosaveDelaySec", "1.5");
    formData.append("defaultNoteFont", "sans");

    const res = await updateUserSettingsAction(formData);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Unauthorized");
    expect(prisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  it("should validate defaultNoteFont values correctly", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "admin@filebucket.local" },
      expires: "tomorrow",
    });

    const formData = new FormData();
    formData.append("quotaLimitGb", "10");
    formData.append("autosaveDelaySec", "1.5");
    formData.append("defaultNoteFont", "invalid-font");

    const res = await updateUserSettingsAction(formData);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Font must be 'sans', 'serif', or 'mono'");
    expect(prisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  it("should validate minimum quotaLimit values correctly", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "admin@filebucket.local" },
      expires: "tomorrow",
    });

    const formData = new FormData();
    formData.append("quotaLimitGb", "0");
    formData.append("autosaveDelaySec", "1.5");
    formData.append("defaultNoteFont", "sans");

    const res = await updateUserSettingsAction(formData);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Quota limit must be at least 1 GB");
    expect(prisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  it("should validate autosave delay bounds correctly", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "admin@filebucket.local" },
      expires: "tomorrow",
    });

    // Too small (< 0.5s)
    const formData1 = new FormData();
    formData1.append("quotaLimitGb", "10");
    formData1.append("autosaveDelaySec", "0.2");
    formData1.append("defaultNoteFont", "sans");

    const res1 = await updateUserSettingsAction(formData1);
    expect(res1.ok).toBe(false);
    expect(res1.error).toContain("Autosave delay must be between 0.5 and 10 seconds");

    // Too large (> 10s)
    const formData2 = new FormData();
    formData2.append("quotaLimitGb", "10");
    formData2.append("autosaveDelaySec", "15");
    formData2.append("defaultNoteFont", "sans");

    const res2 = await updateUserSettingsAction(formData2);
    expect(res2.ok).toBe(false);
    expect(res2.error).toContain("Autosave delay must be between 0.5 and 10 seconds");
  });

  it("should successfully update settings with valid data", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "admin@filebucket.local" },
      expires: "tomorrow",
    });

    const formData = new FormData();
    formData.append("quotaLimitGb", "5"); // 5 GB
    formData.append("autosaveDelaySec", "2"); // 2s (2000ms)
    formData.append("defaultNoteFont", "serif");

    vi.mocked(prisma.userSettings.upsert).mockResolvedValue({
      id: "settings-id",
      userId: mockUserId,
      quotaLimit: 5 * 1024 * 1024 * 1024,
      autosaveDelay: 2000,
      defaultNoteFont: "serif",
      theme: "dark",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await updateUserSettingsAction(formData);
    expect(res.ok).toBe(true);
    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      update: {
        quotaLimit: 5 * 1024 * 1024 * 1024,
        autosaveDelay: 2000,
        defaultNoteFont: "serif",
      },
      create: {
        userId: mockUserId,
        quotaLimit: 5 * 1024 * 1024 * 1024,
        autosaveDelay: 2000,
        defaultNoteFont: "serif",
        theme: "dark",
      },
    });
  });
});

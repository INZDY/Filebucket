import { describe, it, expect, vi, beforeEach } from "vitest";
import { initializeUserVault } from "@/lib/user-init";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("initializeUserVault", () => {
  const mockUserId = "user-abc-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create all 3 reserved folders if none exist", async () => {
    vi.mocked(prisma.folder.findMany).mockResolvedValue([]);
    vi.mocked(prisma.folder.create).mockResolvedValue({ id: "dummy-id" } as any);

    await initializeUserVault(mockUserId);

    expect(prisma.folder.findMany).toHaveBeenCalledWith({
      where: {
        userId: mockUserId,
        type: {
          in: ["NOTES_ROOT", "KEEP_ROOT", "CHAT_ROOT"],
        },
      },
    });

    expect(prisma.folder.create).toHaveBeenCalledTimes(3);

    expect(prisma.folder.create).toHaveBeenNthCalledWith(1, {
      data: {
        name: "Notes",
        type: "NOTES_ROOT",
        userId: mockUserId,
        parentId: null,
      },
    });

    expect(prisma.folder.create).toHaveBeenNthCalledWith(2, {
      data: {
        name: "Quick Notes",
        type: "KEEP_ROOT",
        userId: mockUserId,
        parentId: null,
      },
    });

    expect(prisma.folder.create).toHaveBeenNthCalledWith(3, {
      data: {
        name: "Chat Channels",
        type: "CHAT_ROOT",
        userId: mockUserId,
        parentId: null,
      },
    });
  });

  it("should not create folders that already exist", async () => {
    vi.mocked(prisma.folder.findMany).mockResolvedValue([
      { id: "f1", name: "Notes", type: "NOTES_ROOT", userId: mockUserId, parentId: null } as any,
    ]);
    vi.mocked(prisma.folder.create).mockResolvedValue({ id: "dummy-id" } as any);

    await initializeUserVault(mockUserId);

    expect(prisma.folder.create).toHaveBeenCalledTimes(2);

    expect(prisma.folder.create).toHaveBeenNthCalledWith(1, {
      data: {
        name: "Quick Notes",
        type: "KEEP_ROOT",
        userId: mockUserId,
        parentId: null,
      },
    });

    expect(prisma.folder.create).toHaveBeenNthCalledWith(2, {
      data: {
        name: "Chat Channels",
        type: "CHAT_ROOT",
        userId: mockUserId,
        parentId: null,
      },
    });
  });

  it("should do nothing if all 3 reserved folders already exist", async () => {
    vi.mocked(prisma.folder.findMany).mockResolvedValue([
      { id: "f1", name: "Notes", type: "NOTES_ROOT", userId: mockUserId, parentId: null } as any,
      { id: "f2", name: "Quick Notes", type: "KEEP_ROOT", userId: mockUserId, parentId: null } as any,
      { id: "f3", name: "Chat Channels", type: "CHAT_ROOT", userId: mockUserId, parentId: null } as any,
    ]);

    await initializeUserVault(mockUserId);

    expect(prisma.folder.create).not.toHaveBeenCalled();
  });
});

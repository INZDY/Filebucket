import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSession, requireSession } from "@/lib/auth";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Authentication Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSession", () => {
    it("should return null if auth() returns no session", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const result = await getSession();
      expect(result).toBeNull();
    });

    it("should return null if auth() returns a session without user email", async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} });
      const result = await getSession();
      expect(result).toBeNull();
    });

    it("should return email and user if auth() succeeds", async () => {
      const mockUser = { name: "Admin", email: "admin@filebucket.local" };
      vi.mocked(auth).mockResolvedValue({ user: mockUser });

      const result = await getSession();
      expect(result).toEqual({
        email: "admin@filebucket.local",
        user: mockUser,
      });
    });
  });

  describe("requireSession", () => {
    it("should return session if user is logged in", async () => {
      const mockUser = { name: "Admin", email: "admin@filebucket.local" };
      vi.mocked(auth).mockResolvedValue({ user: mockUser });

      const result = await requireSession();
      expect(result).toEqual({
        email: "admin@filebucket.local",
        user: mockUser,
      });
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should redirect to /login if user is not logged in", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      await requireSession();
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });
});

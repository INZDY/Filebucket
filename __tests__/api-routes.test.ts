import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getNote } from "@/app/api/notes/[id]/route";
import { GET as getFolder } from "@/app/api/folders/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    folder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    mediaAsset: {
      findMany: vi.fn(),
    },
  },
}));

describe("Dynamic API Routes", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/notes/[id]", () => {
    it("should return 401 Unauthorized if no active session", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/notes/note-123");
      const res = await getNote(req, { params: Promise.resolve({ id: "note-123" }) });
      expect(res.status).toBe(401);
    });

    it("should return 404 if note not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      vi.mocked(prisma.note.findFirst).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/notes/note-123");
      const res = await getNote(req, { params: Promise.resolve({ id: "note-123" }) });
      expect(res.status).toBe(404);
    });

    it("should return note details if found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      const mockNote = { id: "note-123", title: "Test Note", body: "Hello World", userId: mockUserId };
      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      const req = new NextRequest("http://localhost/api/notes/note-123");
      const res = await getNote(req, { params: Promise.resolve({ id: "note-123" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("note-123");
    });
  });

  describe("GET /api/folders/[id]", () => {
    it("should return 401 Unauthorized if no active session", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/folders/folder-123");
      const res = await getFolder(req, { params: Promise.resolve({ id: "folder-123" }) });
      expect(res.status).toBe(401);
    });

    it("should return 404 if folder not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/folders/folder-123");
      const res = await getFolder(req, { params: Promise.resolve({ id: "folder-123" }) });
      expect(res.status).toBe(404);
    });

    it("should return folder details and contents if found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      const mockFolder = { id: "folder-123", name: "Test Folder", userId: mockUserId };
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolder as any);
      vi.mocked(prisma.folder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/folders/folder-123");
      const res = await getFolder(req, { params: Promise.resolve({ id: "folder-123" }) });
      expect(res.status).toBe(200);
      
      const json = await res.json();
      expect(json.folder.id).toBe("folder-123");
      expect(json.children).toEqual([]);
      expect(json.notes).toEqual([]);
      expect(json.mediaAssets).toEqual([]);
    });
  });
});

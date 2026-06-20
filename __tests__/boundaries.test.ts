import { describe, it, expect, vi, beforeEach } from "vitest";
import { moveFolderAction } from "@/app/folders/actions";
import { moveNoteAction } from "@/app/notes/actions";
import { moveMediaAssetAction } from "@/app/media/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const err = new Error("NEXT_REDIRECT");
    (err as any).digest = `NEXT_REDIRECT;307;${url};false;`;
    throw err;
  }),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth requireSession
vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(),
}));

// Mock prisma database
vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    note: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    mediaAsset: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
  },
}));

describe("Cross-Mode Boundary Move Actions", () => {
  const mockUserId = "user-123";

  // Mock folder database database mapper
  const folderMockDb: Record<string, { id: string; name: string; parentId: string | null; type: string }> = {
    "notes-root": { id: "notes-root", name: "Notes", parentId: null, type: "NOTES_ROOT" },
    "keep-root": { id: "keep-root", name: "Quick Notes", parentId: null, type: "KEEP_ROOT" },
    "chat-root": { id: "chat-root", name: "Chat Channels", parentId: null, type: "CHAT_ROOT" },
    "notes-sub": { id: "notes-sub", name: "Work notes", parentId: "notes-root", type: "GENERAL" },
    "chat-sub": { id: "chat-sub", name: "gaming", parentId: "chat-root", type: "GENERAL" },
    "general-folder": { id: "general-folder", name: "Custom files", parentId: null, type: "GENERAL" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (requireSession as any).mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
    });

    // Setup folder mock resolver
    (prisma.folder.findFirst as any).mockImplementation((args: any) => {
      const id = args.where.id;
      return Promise.resolve(folderMockDb[id] || null);
    });
  });

  describe("moveFolderAction Boundaries", () => {
    it("should block moving a GENERAL folder from Files Mode (general-folder) into Notes Mode (notes-root)", async () => {
      const formData = new FormData();
      formData.append("folderId", "general-folder");
      formData.append("parentId", "notes-root");

      await moveFolderAction(formData);

      // Verify update was NOT called because it violates the boundary
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should block moving an Obsidian folder (notes-sub) out to Files Mode root (null)", async () => {
      const formData = new FormData();
      formData.append("folderId", "notes-sub");
      formData.append("parentId", ""); // root is null

      await moveFolderAction(formData);

      expect(prisma.folder.update).not.toHaveBeenCalled();
    });
  });

  describe("moveNoteAction Boundaries", () => {
    it("should block moving a Keep note from keep-root into notes-sub (Obsidian)", async () => {
      (prisma.note.findFirst as any).mockResolvedValue({
        id: "note-keep",
        title: "Keep item",
        folderId: "keep-root",
      });

      const formData = new FormData();
      formData.append("noteId", "note-keep");
      formData.append("folderId", "notes-sub");

      await moveNoteAction(formData);

      expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it("should block moving an Obsidian note from notes-sub out to Files Mode root (null)", async () => {
      (prisma.note.findFirst as any).mockResolvedValue({
        id: "note-obsidian",
        title: "Obsidian doc",
        folderId: "notes-sub",
      });

      const formData = new FormData();
      formData.append("noteId", "note-obsidian");
      formData.append("folderId", ""); // null parent

      await moveNoteAction(formData);

      expect(prisma.note.update).not.toHaveBeenCalled();
    });
  });

  describe("moveMediaAssetAction Boundaries", () => {
    it("should allow moving a media asset from Files Mode (null) to Obsidian Mode (notes-sub)", async () => {
      (prisma.mediaAsset.findFirst as any).mockResolvedValue({
        id: "media-file",
        filename: "test.png",
        folderId: null,
      });

      const formData = new FormData();
      formData.append("mediaAssetId", "media-file");
      formData.append("folderId", "notes-sub");

      try {
        await moveMediaAssetAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      // Verify update WAS called
      expect(prisma.mediaAsset.update).toHaveBeenCalled();
    });

    it("should block moving a media asset from Chat Mode (chat-sub) to Files Mode (general-folder)", async () => {
      (prisma.mediaAsset.findFirst as any).mockResolvedValue({
        id: "media-chat-file",
        filename: "screenshot.png",
        folderId: "chat-sub",
      });

      const formData = new FormData();
      formData.append("mediaAssetId", "media-chat-file");
      formData.append("folderId", "general-folder");

      await moveMediaAssetAction(formData);

      // Verify update was NOT called
      expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
    });
  });
});

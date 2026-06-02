import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNoteAction,
  importMarkdownNotesAction,
  updateNoteAction,
  moveNoteAction,
  trashNoteAction,
  restoreNoteAction,
  renameNoteAction,
} from "@/app/notes/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: {
      findFirst: vi.fn(),
    },
    note: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    mediaAsset: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Note Server Actions", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSession).mockResolvedValue({
      email: "user@filebucket.local",
      user: { id: mockUserId },
    });
  });

  describe("createNoteAction", () => {
    it("should successfully create a new note with a unique name and suffix on collision", async () => {
      // Mock folders checking
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123" } as any);
      // Mock sibling name checking: "Untitled note.md" collides, but "Untitled note 2.md" is free
      vi.mocked(prisma.note.findMany).mockResolvedValue([
        { title: "Untitled note" },
      ] as any);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);

      vi.mocked(prisma.note.create).mockResolvedValue({ id: "note-456" } as any);

      const formData = new FormData();
      formData.append("folderId", "folder-123");

      await createNoteAction(formData);

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "Untitled note 2",
          body: "# Untitled note\n\nStart writing in Markdown.",
          folderId: "folder-123",
          userId: mockUserId,
        },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-123&note=note-456");
    });
  });

  describe("importMarkdownNotesAction", () => {
    it("should import files and redirect to the first imported note", async () => {
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.note.create).mockResolvedValue({ id: "imported-1" } as any);

      const file = new File(["# Imported content"], "imported-file.md", { type: "text/markdown" });

      const formData = new FormData();
      formData.append("files", file);

      await importMarkdownNotesAction(formData);

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "imported-file",
          body: "# Imported content",
          folderId: undefined,
          userId: mockUserId,
        },
        select: { id: true },
      });
      expect(redirect).toHaveBeenCalledWith("/?note=imported-1");
    });
  });

  describe("updateNoteAction", () => {
    it("should return error if note is not found or is trashed", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

      const result = await updateNoteAction("invalid-note", "New Title", "New Body");

      expect(result).toEqual({ ok: false, error: "Note is unavailable." });
      expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it("should return error if name collides with another sibling", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-123", folderId: null } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([{ title: "Colliding" }] as any);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);

      const result = await updateNoteAction("note-123", "Colliding", "New Body");

      expect(result).toEqual({ ok: false, error: "A note or media asset with this name already exists here." });
      expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it("should update body and title successfully", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-123", folderId: null } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);

      const result = await updateNoteAction("note-123", "New Valid Title", "New Body content");

      expect(result).toEqual({ ok: true });
      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-123" },
        data: { title: "New Valid Title", body: "New Body content" },
      });
    });
  });

  describe("moveNoteAction", () => {
    it("should move note to target folder successfully", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-123", title: "Note" } as any);
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-789" } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);

      const formData = new FormData();
      formData.append("noteId", "note-123");
      formData.append("folderId", "folder-789");

      await moveNoteAction(formData);

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-123" },
        data: { folderId: "folder-789" },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-789&note=note-123");
    });
  });

  describe("trashNoteAction", () => {
    it("should trash note and redirect", async () => {
      const formData = new FormData();
      formData.append("noteId", "note-123");

      await trashNoteAction(formData);

      expect(prisma.note.updateMany).toHaveBeenCalledWith({
        where: {
          id: "note-123",
          userId: mockUserId,
          deletedAt: null,
          OR: [{ folderId: null }, { folder: { is: { deletedAt: null } } }],
        },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe("restoreNoteAction", () => {
    it("should restore note and redirect", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-123", folderId: null } as any);

      const formData = new FormData();
      formData.append("noteId", "note-123");

      await restoreNoteAction(formData);

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-123" },
        data: { deletedAt: null },
      });
      expect(redirect).toHaveBeenCalledWith("/?note=note-123");
    });
  });

  describe("renameNoteAction", () => {
    it("should successfully rename note title and redirect", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-123", folderId: null, title: "Old" } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);

      const formData = new FormData();
      formData.append("noteId", "note-123");
      formData.append("name", "Renamed Note");

      await renameNoteAction(formData);

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-123" },
        data: { title: "Renamed Note" },
      });
      expect(redirect).toHaveBeenCalledWith("/?note=note-123");
    });
  });
});

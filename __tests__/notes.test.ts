import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNoteAction,
  importMarkdownNotesAction,
  updateNoteAction,
  moveNoteAction,
  trashNoteAction,
  restoreNoteAction,
  renameNoteAction,
  createKeepNoteAction,
  updateKeepNoteAction,
  trashKeepNoteAction,
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
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", type: "NOTES_ROOT", parentId: null } as any);
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

    it("should block note creation in FILES mode (root folder or general folders)", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", type: "GENERAL", parentId: null } as any);

      const formData = new FormData();
      formData.append("folderId", "folder-123");

      await createNoteAction(formData);

      expect(prisma.note.create).not.toHaveBeenCalled();
    });

    it("should block note creation at vault root (null folderId)", async () => {
      const formData = new FormData();

      await createNoteAction(formData);

      expect(prisma.note.create).not.toHaveBeenCalled();
    });
  });

  describe("importMarkdownNotesAction", () => {
    it("should import files and redirect to the first imported note", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", type: "NOTES_ROOT", parentId: null } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.note.create).mockResolvedValue({ id: "imported-1" } as any);

      const file = new File(["# Imported content"], "imported-file.md", { type: "text/markdown" });

      const formData = new FormData();
      formData.append("files", file);
      formData.append("folderId", "folder-123");

      await importMarkdownNotesAction(formData);

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "imported-file",
          body: "# Imported content",
          folderId: "folder-123",
          userId: mockUserId,
        },
        select: { id: true },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-123&note=imported-1");
    });

    it("should block note import in FILES mode", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", type: "GENERAL", parentId: null } as any);

      const file = new File(["# Content"], "file.md", { type: "text/markdown" });
      const formData = new FormData();
      formData.append("files", file);
      formData.append("folderId", "folder-123");

      await importMarkdownNotesAction(formData);

      expect(prisma.note.create).not.toHaveBeenCalled();
    });

    it("should block note import at vault root (null folderId)", async () => {
      const file = new File(["# Content"], "file.md", { type: "text/markdown" });
      const formData = new FormData();
      formData.append("files", file);

      await importMarkdownNotesAction(formData);

      expect(prisma.note.create).not.toHaveBeenCalled();
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
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-789", type: "NOTES_ROOT" } as any)
        .mockResolvedValueOnce({ id: "folder-789", type: "NOTES_ROOT" } as any);
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

    it("should block moving note to a folder in FILES mode", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-123", title: "Note" } as any);
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-files", type: "GENERAL", parentId: null } as any) // getActiveFolder
        .mockResolvedValueOnce({ id: "folder-files", type: "GENERAL", parentId: null } as any); // getFolderMode (resolves to FILES)

      const formData = new FormData();
      formData.append("noteId", "note-123");
      formData.append("folderId", "folder-files");

      await moveNoteAction(formData);

      expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it("should block moving note to a folder in CHAT mode", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-123", title: "Note" } as any);
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-chat", type: "GENERAL", parentId: "chat-root" } as any) // getActiveFolder
        .mockResolvedValueOnce({ id: "folder-chat", type: "GENERAL", parentId: "chat-root" } as any) // getFolderMode loop 1
        .mockResolvedValueOnce({ id: "chat-root", type: "CHAT_ROOT", parentId: null } as any); // getFolderMode loop 2

      const formData = new FormData();
      formData.append("noteId", "note-123");
      formData.append("folderId", "folder-chat");

      await moveNoteAction(formData);

      expect(prisma.note.update).not.toHaveBeenCalled();
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

  describe("Keep Note Actions", () => {
    describe("createKeepNoteAction", () => {
      it("should successfully create a Keep note under target folder", async () => {
        vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "keep-folder-123" } as any);
        vi.mocked(prisma.note.create).mockResolvedValue({ id: "keep-note-456" } as any);

        const result = await createKeepNoteAction({
          folderId: "keep-folder-123",
          title: "Keep Title",
          body: "Keep Body",
          color: "red",
          isPinned: true,
        });

        expect(result).toEqual({ ok: true, note: expect.any(Object) });
        expect(prisma.note.create).toHaveBeenCalledWith({
          data: {
            title: "Keep Title",
            body: "Keep Body",
            folderId: "keep-folder-123",
            userId: mockUserId,
            color: "red",
            isPinned: true,
          },
        });
      });
    });

    describe("updateKeepNoteAction", () => {
      it("should successfully update Keep note color and pin status", async () => {
        vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "keep-note-123" } as any);
        vi.mocked(prisma.note.update).mockResolvedValue({ id: "keep-note-123", color: "blue" } as any);

        const result = await updateKeepNoteAction("keep-note-123", {
          color: "blue",
          isPinned: false,
        });

        expect(result).toEqual({ ok: true, note: expect.any(Object) });
        expect(prisma.note.update).toHaveBeenCalledWith({
          where: { id: "keep-note-123" },
          data: {
            title: undefined,
            body: undefined,
            color: "blue",
            isPinned: false,
          },
        });
      });
    });

    describe("trashKeepNoteAction", () => {
      it("should successfully trash Keep note", async () => {
        vi.mocked(prisma.note.updateMany).mockResolvedValue({ count: 1 } as any);

        const result = await trashKeepNoteAction("keep-note-123");

        expect(result).toEqual({ ok: true });
        expect(prisma.note.updateMany).toHaveBeenCalledWith({
          where: {
            id: "keep-note-123",
            userId: mockUserId,
            deletedAt: null,
          },
          data: {
            deletedAt: expect.any(Date),
          },
        });
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTagAction,
  toggleNoteTagAction,
  renameTagAction,
  deleteTagAction,
} from "@/app/tags/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      findFirst: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    noteTag: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const err = new Error("NEXT_REDIRECT");
    (err as any).digest = `NEXT_REDIRECT;307;${url};false;`;
    throw err;
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Tag Server Actions", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSession).mockResolvedValue({
      email: "user@filebucket.local",
      user: { id: mockUserId },
    });
  });

  describe("createTagAction", () => {
    it("should successfully create/upsert tag and optionally attach it to a note", async () => {
      vi.mocked(prisma.tag.upsert).mockResolvedValue({ id: "tag-555" } as any);
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-777" } as any);

      const formData = new FormData();
      formData.append("name", "Travel Tips");
      formData.append("noteId", "note-777");
      formData.append("returnTo", "/?note=note-777");

      try {
        await createTagAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.tag.upsert).toHaveBeenCalledWith({
        where: {
          userId_slug: {
            userId: mockUserId,
            slug: "travel-tips",
          },
        },
        update: { name: "Travel Tips" },
        create: {
          name: "Travel Tips",
          slug: "travel-tips",
          userId: mockUserId,
        },
      });

      expect(prisma.noteTag.upsert).toHaveBeenCalledWith({
        where: {
          noteId_tagId: {
            noteId: "note-777",
            tagId: "tag-555",
          },
        },
        update: {},
        create: {
          noteId: "note-777",
          tagId: "tag-555",
        },
      });
      expect(redirect).toHaveBeenCalledWith("/?note=note-777");
    });
  });

  describe("toggleNoteTagAction", () => {
    it("should delete existing note-tag link if it exists", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-1" } as any);
      vi.mocked(prisma.tag.findFirst).mockResolvedValue({ id: "tag-1" } as any);
      vi.mocked(prisma.noteTag.findUnique).mockResolvedValue({ noteId: "note-1", tagId: "tag-1" } as any);

      const formData = new FormData();
      formData.append("noteId", "note-1");
      formData.append("tagId", "tag-1");

      try {
        await toggleNoteTagAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.noteTag.delete).toHaveBeenCalledWith({
        where: {
          noteId_tagId: {
            noteId: "note-1",
            tagId: "tag-1",
          },
        },
      });
    });

    it("should create note-tag link if it does not exist", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({ id: "note-1" } as any);
      vi.mocked(prisma.tag.findFirst).mockResolvedValue({ id: "tag-1" } as any);
      vi.mocked(prisma.noteTag.findUnique).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("noteId", "note-1");
      formData.append("tagId", "tag-1");

      try {
        await toggleNoteTagAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.noteTag.create).toHaveBeenCalledWith({
        data: {
          noteId: "note-1",
          tagId: "tag-1",
        },
      });
    });
  });

  describe("renameTagAction", () => {
    it("should fail if new slug collides with another tag", async () => {
      vi.mocked(prisma.tag.findFirst)
        .mockResolvedValueOnce({ id: "tag-1" } as any) // target tag exists
        .mockResolvedValueOnce({ id: "colliding-tag" } as any); // collision found

      const formData = new FormData();
      formData.append("tagId", "tag-1");
      formData.append("name", "Colliding Name");
      formData.append("returnTo", "/");

      try {
        await renameTagAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.tag.update).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith("/");
    });

    it("should successfully rename and redirect", async () => {
      vi.mocked(prisma.tag.findFirst)
        .mockResolvedValueOnce({ id: "tag-1" } as any) // target tag exists
        .mockResolvedValueOnce(null); // no collision

      const formData = new FormData();
      formData.append("tagId", "tag-1");
      formData.append("name", "Renamed Name");

      try {
        await renameTagAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.tag.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: {
          name: "Renamed Name",
          slug: "renamed-name",
        },
      });
      expect(redirect).toHaveBeenCalledWith("/?tag=renamed-name");
    });
  });

  describe("deleteTagAction", () => {
    it("should delete tag and redirect to root", async () => {
      const formData = new FormData();
      formData.append("tagId", "tag-1");

      try {
        await deleteTagAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.tag.deleteMany).toHaveBeenCalledWith({
        where: {
          id: "tag-1",
          userId: mockUserId,
        },
      });
      expect(redirect).toHaveBeenCalledWith("/");
    });
  });
});

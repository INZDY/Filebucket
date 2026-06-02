import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFolderAction,
  renameFolderAction,
  moveFolderAction,
  trashFolderAction,
  restoreFolderAction,
} from "@/app/folders/actions";
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
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Folder Server Actions", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSession).mockResolvedValue({
      email: "user@filebucket.local",
      user: { id: mockUserId },
    });
  });

  describe("createFolderAction", () => {
    it("should do nothing if name is empty", async () => {
      const formData = new FormData();
      formData.append("name", "");

      await createFolderAction(formData);

      expect(prisma.folder.create).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should fail if parentId is provided but not found", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("name", "New Folder");
      formData.append("parentId", "parent-999");

      await createFolderAction(formData);

      expect(prisma.folder.create).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("should fail if sibling folder name collides case-insensitively", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "parent-123", name: "Parent", parentId: null }) // getActiveFolder check
        .mockResolvedValueOnce({ id: "colliding-id" }); // hasSiblingName check

      const formData = new FormData();
      formData.append("name", "colliding");
      formData.append("parentId", "parent-123");

      await createFolderAction(formData);

      expect(prisma.folder.create).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("should successfully create folder and redirect", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "parent-123", name: "Parent", parentId: null }) // getActiveFolder check
        .mockResolvedValueOnce(null); // hasSiblingName check (no collision)

      vi.mocked(prisma.folder.create).mockResolvedValue({ id: "new-folder-789" } as any);

      const formData = new FormData();
      formData.append("name", "New Folder");
      formData.append("parentId", "parent-123");

      await createFolderAction(formData);

      expect(prisma.folder.create).toHaveBeenCalledWith({
        data: {
          name: "New Folder",
          parentId: "parent-123",
          userId: mockUserId,
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(redirect).toHaveBeenCalledWith("/?folder=new-folder-789");
    });
  });

  describe("renameFolderAction", () => {
    it("should fail if name or folderId is missing", async () => {
      const formData = new FormData();
      formData.append("folderId", "");
      formData.append("name", "Renamed Folder");

      await renameFolderAction(formData);
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should fail if name collides with another sibling", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: null }) // getActiveFolder
        .mockResolvedValueOnce({ id: "colliding-id" }); // hasSiblingName collision

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("name", "Colliding Name");

      await renameFolderAction(formData);
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should successfully update name and redirect", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: "parent-123" }) // getActiveFolder
        .mockResolvedValueOnce(null); // hasSiblingName (no collision)

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("name", "Valid Rename");

      await renameFolderAction(formData);

      expect(prisma.folder.update).toHaveBeenCalledWith({
        where: { id: "folder-123" },
        data: { name: "Valid Rename" },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-123");
    });
  });

  describe("moveFolderAction", () => {
    it("should prevent cycle by blocking moving folder into itself", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: null }) // target folder
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: null }); // parent folder (same id)

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("parentId", "folder-123");

      await moveFolderAction(formData);
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should prevent cycle by blocking moving folder into its descendant", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: null }) // target
        .mockResolvedValueOnce({ id: "descendant-456", name: "Descendant", parentId: "folder-123" }) // parent
        // isDescendantFolder calls:
        .mockResolvedValueOnce({ parentId: "folder-123" }); // check descendant-456 parent which is folder-123 (matching target ID)

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("parentId", "descendant-456");

      await moveFolderAction(formData);
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should successfully move folder to another location", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: "old-parent" }) // target
        .mockResolvedValueOnce({ id: "new-parent", name: "New Parent", parentId: null }) // new parent
        // isDescendantFolder check (not descendant, returns null):
        .mockResolvedValueOnce(null)
        // hasSiblingName check (no collision, returns null):
        .mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("parentId", "new-parent");

      await moveFolderAction(formData);

      expect(prisma.folder.update).toHaveBeenCalledWith({
        where: { id: "folder-123" },
        data: { parentId: "new-parent" },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-123");
    });
  });

  describe("trashFolderAction", () => {
    it("should trash folder and redirect to root", async () => {
      const formData = new FormData();
      formData.append("folderId", "folder-123");

      await trashFolderAction(formData);

      expect(prisma.folder.updateMany).toHaveBeenCalledWith({
        where: {
          id: "folder-123",
          userId: mockUserId,
          deletedAt: null,
        },
        data: { deletedAt: expect.any(Date) },
      });
      expect(redirect).toHaveBeenCalledWith("/");
    });
  });

  describe("restoreFolderAction", () => {
    it("should restore folder and redirect", async () => {
      const formData = new FormData();
      formData.append("folderId", "folder-123");

      await restoreFolderAction(formData);

      expect(prisma.folder.updateMany).toHaveBeenCalledWith({
        where: {
          id: "folder-123",
          userId: mockUserId,
        },
        data: { deletedAt: null },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-123");
    });
  });
});

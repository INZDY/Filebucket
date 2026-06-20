import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFolderAction,
  renameFolderAction,
  moveFolderAction,
  trashFolderAction,
  restoreFolderAction,
  deleteFolderAction,
} from "@/app/folders/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { namespaceManager } from "@/lib/namespace";

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

vi.mock("@/lib/namespace", () => ({
  namespaceManager: {
    validate: vi.fn(),
    resolve: vi.fn(),
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
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "parent-123", name: "Parent", parentId: null } as any);
      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: false, error: "NameCollision" });

      const formData = new FormData();
      formData.append("name", "colliding");
      formData.append("parentId", "parent-123");

      await createFolderAction(formData);

      expect(prisma.folder.create).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("should successfully create folder and redirect", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "parent-123", name: "Parent", parentId: null } as any);
      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: true });
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
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", name: "Folder", parentId: null, type: "GENERAL" } as any);
      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: false, error: "NameCollision" });

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("name", "Colliding Name");

      await renameFolderAction(formData);
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should successfully update name and redirect", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", name: "Folder", parentId: "parent-123", type: "GENERAL" } as any);
      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: true });

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

    it("should block rename if folder is reserved root type", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", name: "Notes", parentId: null, type: "NOTES_ROOT" } as any);

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("name", "New Name");

      await renameFolderAction(formData);

      expect(prisma.folder.update).not.toHaveBeenCalled();
    });
  });

  describe("moveFolderAction", () => {
    it("should prevent cycle by blocking moving folder into itself", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: null, type: "GENERAL" } as any) // target
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: null, type: "GENERAL" } as any); // parent

      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: false, error: "SelfNesting" });

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("parentId", "folder-123");

      await moveFolderAction(formData);
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should prevent cycle by blocking moving folder into its descendant", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: null, type: "GENERAL" } as any) // target
        .mockResolvedValueOnce({ id: "descendant-456", name: "Descendant", parentId: "folder-123", type: "GENERAL" } as any); // parent

      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: false, error: "SelfNesting" });

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("parentId", "descendant-456");

      await moveFolderAction(formData);
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should successfully move folder to another location", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "folder-123", name: "Folder", parentId: "old-parent", type: "GENERAL" } as any) // target
        .mockResolvedValueOnce({ id: "new-parent", name: "New Parent", parentId: null, type: "GENERAL" } as any); // new parent

      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: true });

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

    it("should block move if folder is reserved root type", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValueOnce({ id: "folder-123", name: "Notes", parentId: null, type: "NOTES_ROOT" } as any);

      const formData = new FormData();
      formData.append("folderId", "folder-123");
      formData.append("parentId", "new-parent");

      await moveFolderAction(formData);

      expect(prisma.folder.update).not.toHaveBeenCalled();
    });
  });

  describe("trashFolderAction", () => {
    it("should trash folder and redirect to root", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", name: "Folder", type: "GENERAL" } as any);
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

    it("should block trashing if folder is reserved root type", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", name: "Notes", type: "NOTES_ROOT" } as any);

      const formData = new FormData();
      formData.append("folderId", "folder-123");

      await trashFolderAction(formData);

      expect(prisma.folder.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteFolderAction", () => {
    it("should block permanent delete if folder is reserved root type", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-123", name: "Notes", type: "NOTES_ROOT" } as any);

      const formData = new FormData();
      formData.append("folderId", "folder-123");

      await deleteFolderAction(formData);

      expect(prisma.folder.updateMany).not.toHaveBeenCalled();
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

  describe("createFolderAction boundaries", () => {
    it("should block folder creation in KEEP mode (under Quick Notes root)", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "keep-root-123", type: "KEEP_ROOT", parentId: null } as any);

      const formData = new FormData();
      formData.append("name", "New Subfolder");
      formData.append("parentId", "keep-root-123");

      await createFolderAction(formData);

      expect(prisma.folder.create).not.toHaveBeenCalled();
    });

    it("should block subfolder creation inside chat channels (where parent is a channel, parentId !== chatRootId)", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "channel-123", type: "GENERAL", parentId: "chat-root-id" } as any) // parent
        .mockResolvedValueOnce({ id: "chat-root-id", type: "CHAT_ROOT", parentId: null } as any); // grandparent

      const formData = new FormData();
      formData.append("name", "Nested Channel Folder");
      formData.append("parentId", "channel-123");

      await createFolderAction(formData);

      expect(prisma.folder.create).not.toHaveBeenCalled();
    });

    it("should allow folder (channel) creation directly under CHAT_ROOT", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "chat-root-id", type: "CHAT_ROOT", parentId: null } as any);
      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: true });
      vi.mocked(prisma.folder.create).mockResolvedValue({ id: "new-channel-id" } as any);

      const formData = new FormData();
      formData.append("name", "#new-channel");
      formData.append("parentId", "chat-root-id");

      await createFolderAction(formData);

      expect(prisma.folder.create).toHaveBeenCalled();
    });
  });
});

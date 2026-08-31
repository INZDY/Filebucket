import { describe, it, expect, vi, beforeEach } from "vitest";
import { bulkMoveItemsAction, bulkTrashItemsAction } from "@/app/bulk/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { namespaceManager } from "@/lib/namespace";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    mediaAsset: {
      findFirst: vi.fn(),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Bulk Server Actions", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSession).mockResolvedValue({
      email: "user@filebucket.local",
      user: { id: mockUserId },
    });
  });

  describe("bulkMoveItemsAction", () => {
    const destFolder = { id: "dest", name: "Destination", parentId: null, type: "GENERAL" };
    const folderF1 = { id: "f1", name: "Docs", parentId: null, type: "GENERAL" };
    const notesRoot = { id: "notes-root", name: "Notes", parentId: null, type: "NOTES_ROOT" };
    const mediaM1 = { id: "m1", filename: "pic.png", folderId: null };
    const mediaM2 = { id: "m2", filename: "locked.mp3", folderId: "keep-root" };

    function mockFolderLookups(folders: any[]) {
      vi.mocked(prisma.folder.findFirst).mockImplementation(async ({ where }: any) => {
        return folders.find((f) => f.id === where?.id) ?? null;
      });
    }

    it("should move folders and media to the target, returning no failures", async () => {
      mockFolderLookups([destFolder, folderF1]);
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue(mediaM1 as any);
      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: true, error: undefined });

      const result = await bulkMoveItemsAction(
        [
          { type: "folder", id: "f1" },
          { type: "media", id: "m1" },
        ],
        "dest"
      );

      expect(result.failures).toEqual([]);
      expect(prisma.folder.update).toHaveBeenCalledWith({
        where: { id: "f1" },
        data: { parentId: "dest" },
      });
      expect(prisma.mediaAsset.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { folderId: "dest" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("should move to vault root when targetFolderId is null", async () => {
      mockFolderLookups([folderF1]);
      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: true, error: undefined });

      const result = await bulkMoveItemsAction([{ type: "folder", id: "f1" }], null);

      expect(result.failures).toEqual([]);
      expect(prisma.folder.update).toHaveBeenCalledWith({
        where: { id: "f1" },
        data: { parentId: null },
      });
    });

    it("should fail reserved folders and keep moving the rest (best effort)", async () => {
      mockFolderLookups([destFolder, notesRoot, folderF1]);
      vi.mocked(namespaceManager.validate).mockResolvedValue({ isValid: true, error: undefined });

      const result = await bulkMoveItemsAction(
        [
          { type: "folder", id: "notes-root" },
          { type: "folder", id: "f1" },
        ],
        "dest"
      );

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].id).toBe("notes-root");
      expect(result.failures[0].reason).toContain("Reserved system folders");
      expect(prisma.folder.update).toHaveBeenCalledTimes(1);
      expect(prisma.folder.update).toHaveBeenCalledWith({
        where: { id: "f1" },
        data: { parentId: "dest" },
      });
    });

    it("should report a name collision without moving the colliding item", async () => {
      mockFolderLookups([destFolder, folderF1]);
      vi.mocked(namespaceManager.validate).mockResolvedValue({
        isValid: false,
        error: "NameCollision",
      });

      const result = await bulkMoveItemsAction([{ type: "folder", id: "f1" }], "dest");

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].id).toBe("f1");
      expect(result.failures[0].reason).toContain("same name already exists");
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });

    it("should fail media locked inside KEEP/CHAT roots", async () => {
      mockFolderLookups([destFolder, { id: "keep-root", name: "Quick Notes", parentId: null, type: "KEEP_ROOT" }]);
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue(mediaM2 as any);

      const result = await bulkMoveItemsAction([{ type: "media", id: "m2" }], "dest");

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].id).toBe("m2");
      expect(result.failures[0].reason).toContain("locked");
      expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
    });

    it("should fail every item when the target folder does not exist", async () => {
      mockFolderLookups([folderF1]);
      const result = await bulkMoveItemsAction([{ type: "folder", id: "f1" }], "missing");

      expect(result.failures).toHaveLength(1);
      expect(prisma.folder.update).not.toHaveBeenCalled();
    });
  });

  describe("bulkTrashItemsAction", () => {
    const folderF1 = { id: "f1", name: "Docs", parentId: null, type: "GENERAL" };
    const subFolder = { id: "sub", name: "Sub", parentId: "f1", type: "GENERAL" };
    const notesRoot = { id: "notes-root", name: "Notes", parentId: null, type: "NOTES_ROOT" };
    const mediaM1 = { id: "m1", filename: "pic.png", folderId: null };
    const mediaInsideF1 = { id: "m2", filename: "inside.png", folderId: "f1" };

    it("should trash selected folders and media, returning no failures", async () => {
      vi.mocked(prisma.folder.findMany).mockResolvedValue([folderF1, subFolder, notesRoot] as any);
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(folderF1 as any);
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue(mediaM1 as any);

      const result = await bulkTrashItemsAction([
        { type: "folder", id: "f1" },
        { type: "media", id: "m1" },
      ]);

      expect(result.failures).toEqual([]);
      expect(prisma.folder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: "f1" }) })
      );
      expect(prisma.mediaAsset.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: "m1" }) })
      );
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("should skip media that sits inside a selected folder (cascade dedupe)", async () => {
      vi.mocked(prisma.folder.findMany).mockResolvedValue([folderF1, subFolder, notesRoot] as any);
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(folderF1 as any);
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue(mediaInsideF1 as any);

      const result = await bulkTrashItemsAction([
        { type: "folder", id: "f1" },
        { type: "media", id: "m2" },
      ]);

      expect(result.failures).toEqual([]);
      expect(prisma.folder.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.mediaAsset.updateMany).not.toHaveBeenCalled();
    });

    it("should fail reserved folders without trashing them", async () => {
      vi.mocked(prisma.folder.findMany).mockResolvedValue([folderF1, notesRoot] as any);
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(notesRoot as any);

      const result = await bulkTrashItemsAction([{ type: "folder", id: "notes-root" }]);

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].id).toBe("notes-root");
      expect(prisma.folder.updateMany).not.toHaveBeenCalled();
    });
  });
});
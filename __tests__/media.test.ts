import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  moveMediaAssetAction,
  trashMediaAssetAction,
  restoreMediaAssetAction,
  getPresignedUploadUrlAction,
  createMediaAssetAction,
  renameMediaAssetAction,
  createChatAttachmentAction,
} from "@/app/media/actions";
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
    },
    note: {
      findMany: vi.fn(),
    },
    mediaAsset: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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

vi.mock("@/lib/storage", () => ({
  storageEngine: {
    presignUploadUrl: vi.fn().mockResolvedValue("https://fake-r2-presigned-url.local/upload-here"),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

describe("Media Server Actions", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSession).mockResolvedValue({
      email: "user@filebucket.local",
      user: { id: mockUserId },
    });
    // Set a dummy public base URL for R2 URL formatting
    process.env.R2_PUBLIC_BASE_URL = "https://cdn.filebucket.local";
  });

  describe("getPresignedUploadUrlAction", () => {
    it("should generate a presigned upload URL and clean the filename", async () => {
      const result = await getPresignedUploadUrlAction("my spaces in name.png", "image/png");

      expect(result.uploadUrl).toBe("https://fake-r2-presigned-url.local/upload-here");
      expect(result.r2Key).toContain(`vaults/${mockUserId}/`);
      expect(result.r2Key).toContain("my_spaces_in_name.png");
    });
  });

  describe("createMediaAssetAction", () => {
    it("should successfully create a media asset in the root when no folders are requested", async () => {
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.create).mockImplementation(async ({ data }: any) => ({
        id: "media-999",
        ...data,
      }));

      const res = await createMediaAssetAction({
        filename: "test.png",
        contentType: "image/png",
        sizeBytes: 1024,
        r2Key: "vaults/user-123/uuid-test.png",
        folderId: null,
      });

      expect(res.id).toBe("media-999");
      expect(res.filename).toBe("test.png");
      expect(res.url).toBe("https://cdn.filebucket.local/vaults/user-123/uuid-test.png");
      expect(prisma.mediaAsset.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          filename: "test.png",
          contentType: "image/png",
          sizeBytes: 1024,
          r2Key: "vaults/user-123/uuid-test.png",
          folderId: null,
        },
      });
    });

    it("should use an existing 'assets' folder when useAssetsFolder is true", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "assets-folder-id" } as any) // for finding "assets" folder
        .mockResolvedValueOnce({ id: "assets-folder-id" } as any); // for getActiveFolder check
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.create).mockImplementation(async ({ data }: any) => ({
        id: "media-999",
        ...data,
      }));

      const res = await createMediaAssetAction({
        filename: "pic.jpg",
        contentType: "image/jpeg",
        sizeBytes: 2048,
        r2Key: "vaults/user-123/uuid-pic.jpg",
        folderId: null,
        useAssetsFolder: true,
      });

      expect(res.folderId).toBe("assets-folder-id");
      expect(prisma.folder.create).not.toHaveBeenCalled();
    });

    it("should create a new 'Assets' folder when useAssetsFolder is true and none exists", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce(null) // no existing assets folder
        .mockResolvedValueOnce({ id: "new-assets-folder-id" } as any); // for getActiveFolder check

      vi.mocked(prisma.folder.create).mockResolvedValue({ id: "new-assets-folder-id" } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.create).mockImplementation(async ({ data }: any) => ({
        id: "media-999",
        ...data,
      }));

      const res = await createMediaAssetAction({
        filename: "pic.jpg",
        contentType: "image/jpeg",
        sizeBytes: 2048,
        r2Key: "vaults/user-123/uuid-pic.jpg",
        folderId: null,
        useAssetsFolder: true,
      });

      expect(prisma.folder.create).toHaveBeenCalledWith({
        data: {
          name: "Assets",
          userId: mockUserId,
          parentId: null,
        },
        select: { id: true },
      });
      expect(res.folderId).toBe("new-assets-folder-id");
    });

    it("should handle filename collision by appending suffix", async () => {
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      // Simulate that "pic.jpg" and "pic 2.jpg" already exist, so it should resolve to "pic 3.jpg"
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([
        { filename: "pic.jpg" },
        { filename: "pic 2.jpg" },
      ] as any);

      vi.mocked(prisma.mediaAsset.create).mockImplementation(async ({ data }: any) => ({
        id: "media-999",
        ...data,
      }));

      const res = await createMediaAssetAction({
        filename: "pic.jpg",
        contentType: "image/jpeg",
        sizeBytes: 2048,
        r2Key: "vaults/user-123/uuid-pic.jpg",
        folderId: null,
      });

      expect(res.filename).toBe("pic 3.jpg");
    });
  });

  describe("moveMediaAssetAction", () => {
    it("should successfully move media asset and redirect", async () => {
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue({
        id: "media-1",
        filename: "test.png",
      } as any);
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-2" } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);

      const formData = new FormData();
      formData.append("mediaAssetId", "media-1");
      formData.append("folderId", "folder-2");

      try {
        await moveMediaAssetAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.mediaAsset.update).toHaveBeenCalledWith({
        where: { id: "media-1" },
        data: { folderId: "folder-2" },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-2&media=media-1");
    });

    it("should reject move if target folder does not exist", async () => {
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue({
        id: "media-1",
        filename: "test.png",
      } as any);
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("mediaAssetId", "media-1");
      formData.append("folderId", "folder-nonexistent");

      await moveMediaAssetAction(formData);

      expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("trashMediaAssetAction", () => {
    it("should soft-delete the asset and redirect", async () => {
      const formData = new FormData();
      formData.append("mediaAssetId", "media-1");
      formData.append("folderId", "folder-2");

      try {
        await trashMediaAssetAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.mediaAsset.updateMany).toHaveBeenCalledWith({
        where: {
          id: "media-1",
          userId: mockUserId,
          deletedAt: null,
          OR: [
            { folderId: null },
            {
              folder: {
                is: {
                  deletedAt: null,
                },
              },
            },
          ],
        },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-2");
    });
  });

  describe("restoreMediaAssetAction", () => {
    it("should restore the asset and redirect to its original folder location", async () => {
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue({
        id: "media-1",
        folderId: "folder-2",
      } as any);

      const formData = new FormData();
      formData.append("mediaAssetId", "media-1");

      try {
        await restoreMediaAssetAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.mediaAsset.update).toHaveBeenCalledWith({
        where: { id: "media-1" },
        data: { deletedAt: null },
      });
      expect(redirect).toHaveBeenCalledWith("/?folder=folder-2&media=media-1");
    });
  });

  describe("renameMediaAssetAction", () => {
    it("should successfully rename the asset when no collision is found", async () => {
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue({
        id: "media-1",
        filename: "old-name.png",
        folderId: null,
      } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);

      const formData = new FormData();
      formData.append("mediaAssetId", "media-1");
      formData.append("name", "new-name.png");

      try {
        await renameMediaAssetAction(formData);
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
      }

      expect(prisma.mediaAsset.update).toHaveBeenCalledWith({
        where: { id: "media-1" },
        data: { filename: "new-name.png" },
      });
      expect(redirect).toHaveBeenCalledWith("/?media=media-1");
    });

    it("should abort rename when filename collision exists", async () => {
      vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue({
        id: "media-1",
        filename: "old-name.png",
        folderId: null,
      } as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      // Simulate collision
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([{ filename: "colliding.png" }] as any);

      const formData = new FormData();
      formData.append("mediaAssetId", "media-1");
      formData.append("name", "colliding.png");

      await renameMediaAssetAction(formData);

      expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("createChatAttachmentAction", () => {
    it("should find or create Chat Channels/Attachments folder and save media asset", async () => {
      vi.mocked(prisma.folder.findFirst)
        .mockResolvedValueOnce({ id: "chat-root-id", name: "Chat Channels", type: "CHAT_ROOT" } as any)
        .mockResolvedValueOnce({ id: "attachments-folder-id", name: "Attachments", parentId: "chat-root-id" } as any);

      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mediaAsset.create).mockImplementation(async ({ data }: any) => ({
        id: "media-chat-1",
        ...data,
      }));

      const res = await createChatAttachmentAction({
        filename: "screenshot.png",
        contentType: "image/png",
        sizeBytes: 2048,
        r2Key: "vaults/user-123/uuid-screenshot.png",
      });

      expect(res.id).toBe("media-chat-1");
      expect(res.folderId).toBe("attachments-folder-id");
      expect(res.filename).toBe("screenshot.png");
      expect(res.url).toBe("https://cdn.filebucket.local/vaults/user-123/uuid-screenshot.png");
    });
  });
});


import { prisma } from "@/lib/prisma";
import { VaultNamespaceStore } from "./store";

export class PrismaVaultNamespaceStore implements VaultNamespaceStore {
  async getSiblingFolders(userId: string, parentId: string | null) {
    return prisma.folder.findMany({
      where: {
        userId,
        parentId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async getSiblingNotes(userId: string, parentId: string | null) {
    return prisma.note.findMany({
      where: {
        userId,
        folderId: parentId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });
  }

  async getSiblingMediaAssets(userId: string, parentId: string | null) {
    return prisma.mediaAsset.findMany({
      where: {
        userId,
        folderId: parentId,
        deletedAt: null,
      },
      select: {
        id: true,
        filename: true,
      },
    });
  }

  async getFolderAncestry(userId: string, folderId: string): Promise<string[]> {
    const ancestry: string[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder: { parentId: string | null } | null = await prisma.folder.findFirst({
        where: {
          id: currentId,
          userId,
          deletedAt: null,
        },
        select: { parentId: true },
      });

      if (!folder || !folder.parentId) {
        break;
      }
      ancestry.push(folder.parentId);
      currentId = folder.parentId;
    }

    return ancestry;
  }

  async getAllActiveEntities(userId: string) {
    const [folders, notes, mediaAssets] = await Promise.all([
      prisma.folder.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      }),
      prisma.note.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          folderId: true,
        },
      }),
      prisma.mediaAsset.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          filename: true,
          folderId: true,
        },
      }),
    ]);

    return { folders, notes, mediaAssets };
  }
}

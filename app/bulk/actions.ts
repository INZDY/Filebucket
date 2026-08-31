"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { namespaceManager } from "@/lib/namespace";

export type BulkItem = {
  type: "folder" | "media";
  id: string;
};

export type BulkFailure = {
  type: "folder" | "media";
  id: string;
  name: string;
  reason: string;
};

export type BulkActionResult = {
  failures: BulkFailure[];
};

type FolderMode = "FILES" | "NOTES" | "KEEP" | "CHAT";

async function getFolderMode(userId: string, folderId: string | null): Promise<FolderMode> {
  if (!folderId) return "FILES";
  let current = await prisma.folder.findFirst({
    where: { id: folderId, userId, deletedAt: null },
    select: { id: true, parentId: true, type: true },
  });
  while (current) {
    if (current.type === "NOTES_ROOT") return "NOTES";
    if (current.type === "KEEP_ROOT") return "KEEP";
    if (current.type === "CHAT_ROOT") return "CHAT";
    if (!current.parentId) break;
    current = await prisma.folder.findFirst({
      where: { id: current.parentId, userId, deletedAt: null },
      select: { id: true, parentId: true, type: true },
    });
  }
  return "FILES";
}

function reasonForError(error?: string): string {
  if (error === "NameCollision") {
    return "An item with the same name already exists in the target folder.";
  }
  if (error === "SelfNesting") {
    return "Cannot move a folder inside itself or its sub-folders.";
  }
  return "This item cannot be moved to the target location.";
}

export async function bulkMoveItemsAction(
  items: BulkItem[],
  targetFolderId: string | null
): Promise<BulkActionResult> {
  const session = await requireSession();
  const failures: BulkFailure[] = [];

  const targetFolder = targetFolderId
    ? await prisma.folder.findFirst({
        where: { id: targetFolderId, userId: session.user.id, deletedAt: null },
        select: { id: true, type: true },
      })
    : null;

  if (targetFolderId && !targetFolder) {
    return {
      failures: items.map((item) => ({
        type: item.type,
        id: item.id,
        name: "",
        reason: "Target folder not found.",
      })),
    };
  }

  const targetMode = await getFolderMode(session.user.id, targetFolderId);

  for (const item of items) {
    if (item.type === "folder") {
      const folder = await prisma.folder.findFirst({
        where: { id: item.id, userId: session.user.id, deletedAt: null },
        select: { id: true, name: true, parentId: true, type: true },
      });
      if (!folder) {
        failures.push({ type: "folder", id: item.id, name: "", reason: "Folder not found." });
        continue;
      }
      if (folder.type !== "GENERAL") {
        failures.push({
          type: "folder",
          id: item.id,
          name: folder.name,
          reason: "Reserved system folders cannot be moved.",
        });
        continue;
      }
      const currentMode = await getFolderMode(session.user.id, folder.parentId);
      if (currentMode !== targetMode) {
        failures.push({
          type: "folder",
          id: item.id,
          name: folder.name,
          reason: "Folders cannot be moved across mode boundaries.",
        });
        continue;
      }
      const validation = await namespaceManager.validate(session.user.id, targetFolderId, {
        id: folder.id,
        type: "Folder",
        name: folder.name,
      });
      if (!validation.isValid) {
        failures.push({
          type: "folder",
          id: item.id,
          name: folder.name,
          reason: reasonForError(validation.error),
        });
        continue;
      }
      await prisma.folder.update({
        where: { id: folder.id },
        data: { parentId: targetFolderId },
      });
    } else {
      const media = await prisma.mediaAsset.findFirst({
        where: {
          id: item.id,
          userId: session.user.id,
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
        select: { id: true, filename: true, folderId: true },
      });
      if (!media) {
        failures.push({ type: "media", id: item.id, name: "", reason: "Media asset not found." });
        continue;
      }
      const currentMode = await getFolderMode(session.user.id, media.folderId);
      if (
        currentMode === "KEEP" ||
        currentMode === "CHAT" ||
        targetMode === "KEEP" ||
        targetMode === "CHAT"
      ) {
        failures.push({
          type: "media",
          id: item.id,
          name: media.filename,
          reason: "Chat attachments and Keep media files are locked within their respective roots.",
        });
        continue;
      }
      const validation = await namespaceManager.validate(session.user.id, targetFolderId, {
        id: media.id,
        type: "MediaAsset",
        name: media.filename,
      });
      if (!validation.isValid) {
        failures.push({
          type: "media",
          id: item.id,
          name: media.filename,
          reason: reasonForError(validation.error),
        });
        continue;
      }
      await prisma.mediaAsset.update({
        where: { id: media.id },
        data: { folderId: targetFolderId },
      });
    }
  }

  revalidatePath("/");
  return { failures };
}

export async function bulkTrashItemsAction(items: BulkItem[]): Promise<BulkActionResult> {
  const session = await requireSession();
  const failures: BulkFailure[] = [];

  const selectedFolderIds = items.filter((i) => i.type === "folder").map((i) => i.id);

  // Folders whose soft-delete cascade already covers a media item's location.
  const cascadedFolderIds = new Set<string>(selectedFolderIds);
  if (cascadedFolderIds.size > 0) {
    const allFolders = await prisma.folder.findMany({
      where: { userId: session.user.id, deletedAt: null },
      select: { id: true, parentId: true },
    });
    let changed = true;
    while (changed) {
      changed = false;
      for (const folder of allFolders) {
        if (folder.parentId && cascadedFolderIds.has(folder.parentId) && !cascadedFolderIds.has(folder.id)) {
          cascadedFolderIds.add(folder.id);
          changed = true;
        }
      }
    }
  }

  for (const item of items) {
    if (item.type === "folder") {
      const folder = await prisma.folder.findFirst({
        where: { id: item.id, userId: session.user.id, deletedAt: null },
        select: { id: true, name: true, type: true },
      });
      if (!folder) {
        failures.push({ type: "folder", id: item.id, name: "", reason: "Folder not found." });
        continue;
      }
      if (folder.type !== "GENERAL") {
        failures.push({
          type: "folder",
          id: item.id,
          name: folder.name,
          reason: "Reserved system folders cannot be trashed.",
        });
        continue;
      }
      await prisma.folder.updateMany({
        where: {
          id: item.id,
          userId: session.user.id,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    } else {
      const media = await prisma.mediaAsset.findFirst({
        where: {
          id: item.id,
          userId: session.user.id,
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
        select: { id: true, filename: true, folderId: true },
      });
      if (!media) {
        failures.push({ type: "media", id: item.id, name: "", reason: "Media asset not found." });
        continue;
      }
      if (media.folderId && cascadedFolderIds.has(media.folderId)) {
        continue;
      }
      await prisma.mediaAsset.updateMany({
        where: {
          id: item.id,
          userId: session.user.id,
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
        data: { deletedAt: new Date() },
      });
    }
  }

  revalidatePath("/");
  return { failures };
}
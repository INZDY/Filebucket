"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageEngine } from "@/lib/storage";
import { namespaceManager } from "@/lib/namespace";

function readName(formData: FormData) {
  return String(formData.get("name") ?? "").trim().slice(0, 120);
}

function readFolderId(formData: FormData) {
  return String(formData.get("folderId") ?? "").trim();
}

function readParentId(formData: FormData) {
  return String(formData.get("parentId") ?? "").trim() || null;
}

async function getActiveFolder(userId: string, folderId: string) {
  return prisma.folder.findFirst({
    where: {
      id: folderId,
      userId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      type: true,
    },
  });
}

async function getFolderMode(userId: string, folderId: string | null): Promise<"FILES" | "NOTES" | "KEEP" | "CHAT"> {
  if (!folderId) return "FILES";
  let current = await prisma.folder.findFirst({
    where: { id: folderId, userId, deletedAt: null },
    select: { id: true, parentId: true, type: true }
  });
  while (current) {
    if (current.type === "NOTES_ROOT") return "NOTES";
    if (current.type === "KEEP_ROOT") return "KEEP";
    if (current.type === "CHAT_ROOT") return "CHAT";
    if (!current.parentId) break;
    current = await prisma.folder.findFirst({
      where: { id: current.parentId, userId, deletedAt: null },
      select: { id: true, parentId: true, type: true }
    });
  }
  return "FILES";
}

export async function createFolderAction(formData: FormData) {
  const session = await requireSession();
  const name = readName(formData);
  const parentId = readParentId(formData);

  if (!name) {
    revalidatePath("/");
    return;
  }

  if (parentId) {
    const parent = await getActiveFolder(session.user.id, parentId);
    if (!parent) {
      revalidatePath("/");
      return;
    }
    const mode = await getFolderMode(session.user.id, parentId);
    // Block folder creation in KEEP mode (Quick Notes)
    if (mode === "KEEP") {
      revalidatePath("/");
      return;
    }
    // Block subfolder creation in CHAT mode unless the parent is the root Chat Channels folder
    if (mode === "CHAT" && parent.type !== "CHAT_ROOT") {
      revalidatePath("/");
      return;
    }
  }

  const validation = await namespaceManager.validate(session.user.id, parentId, {
    type: "Folder",
    name,
  });

  if (!validation.isValid) {
    revalidatePath("/");
    return;
  }

  const folder = await prisma.folder.create({
    data: {
      name,
      parentId,
      userId: session.user.id,
    },
  });

  revalidatePath("/");
  redirect(`/?folder=${folder.id}`);
}

export async function renameFolderAction(formData: FormData) {
  const session = await requireSession();
  const folderId = readFolderId(formData);
  const name = readName(formData);

  if (!folderId || !name) {
    revalidatePath("/");
    return;
  }

  const folder = await getActiveFolder(session.user.id, folderId);

  if (!folder || folder.type !== "GENERAL") {
    revalidatePath("/");
    return;
  }

  const validation = await namespaceManager.validate(session.user.id, folder.parentId, {
    id: folder.id,
    type: "Folder",
    name,
  });

  if (!validation.isValid) {
    revalidatePath("/");
    return;
  }

  await prisma.folder.update({
    where: { id: folder.id },
    data: { name },
  });

  revalidatePath("/");
  redirect(`/?folder=${folderId}`);
}

export async function moveFolderAction(formData: FormData) {
  const session = await requireSession();
  const folderId = readFolderId(formData);
  const parentId = readParentId(formData);

  if (!folderId) {
    revalidatePath("/");
    return;
  }

  const [folder, parent] = await Promise.all([
    getActiveFolder(session.user.id, folderId),
    parentId ? getActiveFolder(session.user.id, parentId) : Promise.resolve(null),
  ]);

  if (!folder || folder.type !== "GENERAL" || (parentId && !parent)) {
    revalidatePath("/");
    return;
  }

  if (parentId) {
    const mode = await getFolderMode(session.user.id, parentId);
    if (mode === "KEEP") {
      revalidatePath("/");
      return;
    }
    if (mode === "CHAT" && parent?.type !== "CHAT_ROOT") {
      revalidatePath("/");
      return;
    }
  }

  const validation = await namespaceManager.validate(session.user.id, parentId, {
    id: folder.id,
    type: "Folder",
    name: folder.name,
  });

  if (!validation.isValid) {
    revalidatePath("/");
    return;
  }

  await prisma.folder.update({
    where: { id: folder.id },
    data: { parentId },
  });

  revalidatePath("/");
  redirect(`/?folder=${folder.id}`);
}

export async function trashFolderAction(formData: FormData) {
  const session = await requireSession();
  const folderId = readFolderId(formData);

  if (!folderId) {
    revalidatePath("/");
    return;
  }

  const folder = await getActiveFolder(session.user.id, folderId);
  if (!folder || folder.type !== "GENERAL") {
    revalidatePath("/");
    return;
  }

  await prisma.folder.updateMany({
    where: {
      id: folderId,
      userId: session.user.id,
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/");
  redirect("/");
}

export async function restoreFolderAction(formData: FormData) {
  const session = await requireSession();
  const folderId = readFolderId(formData);

  if (!folderId) {
    revalidatePath("/");
    return;
  }

  await prisma.folder.updateMany({
    where: {
      id: folderId,
      userId: session.user.id,
    },
    data: { deletedAt: null },
  });

  revalidatePath("/");
  redirect(`/?folder=${folderId}`);
}

async function permanentlyDeleteFolderRecursively(userId: string, folderId: string) {
  // Find child notes and delete them
  await prisma.note.deleteMany({
    where: { folderId, userId }
  });

  // Find child media assets, delete from R2, then delete from DB
  const mediaAssets = await prisma.mediaAsset.findMany({
    where: { folderId, userId },
    select: { id: true, r2Key: true }
  });

  for (const media of mediaAssets) {
    try {
      await storageEngine.deleteFile(media.r2Key);
    } catch (err) {
      console.error(`Failed to delete media ${media.id} from R2 during recursive folder delete:`, err);
    }
  }

  await prisma.mediaAsset.deleteMany({
    where: { folderId, userId }
  });

  // Find child subfolders and recursively delete them
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId, userId },
    select: { id: true }
  });

  for (const sub of subfolders) {
    await permanentlyDeleteFolderRecursively(userId, sub.id);
  }

  // Finally delete this folder
  await prisma.folder.delete({
    where: { id: folderId, userId }
  });
}

export async function deleteFolderAction(formData: FormData) {
  const session = await requireSession();
  const folderId = readFolderId(formData);

  if (!folderId) {
    revalidatePath("/");
    return;
  }

  const folder = await prisma.folder.findFirst({
    where: {
      id: folderId,
      userId: session.user.id,
      deletedAt: { not: null }
    }
  });

  if (!folder || folder.type !== "GENERAL") {
    revalidatePath("/");
    return;
  }

  await permanentlyDeleteFolderRecursively(session.user.id, folderId);

  revalidatePath("/");
  redirect("/?view=trash");
}

export async function emptyTrashAction() {
  const session = await requireSession();

  // 1. Get all individual/top-level trashed folders
  const trashedFolders = await prisma.folder.findMany({
    where: { userId: session.user.id, deletedAt: { not: null } },
    select: { id: true }
  });

  for (const folder of trashedFolders) {
    const exists = await prisma.folder.findUnique({ where: { id: folder.id } });
    if (exists) {
      await permanentlyDeleteFolderRecursively(session.user.id, folder.id);
    }
  }

  // 2. Get all trashed notes
  await prisma.note.deleteMany({
    where: { userId: session.user.id, deletedAt: { not: null } }
  });

  // 3. Get all trashed media assets
  const trashedMedia = await prisma.mediaAsset.findMany({
    where: { userId: session.user.id, deletedAt: { not: null } },
    select: { id: true, r2Key: true }
  });

  for (const media of trashedMedia) {
    try {
      await storageEngine.deleteFile(media.r2Key);
    } catch (err) {
      console.error("Failed to delete media from R2 during empty trash:", err);
    }
  }

  await prisma.mediaAsset.deleteMany({
    where: { userId: session.user.id, deletedAt: { not: null } }
  });

  revalidatePath("/");
  redirect("/?view=trash");
}


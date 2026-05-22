"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    },
  });
}

async function hasSiblingName(
  userId: string,
  parentId: string | null,
  name: string,
  excludeId?: string,
) {
  const sibling = await prisma.folder.findFirst({
    where: {
      userId,
      parentId,
      deletedAt: null,
      name: {
        equals: name,
        mode: "insensitive",
      },
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return Boolean(sibling);
}

async function isDescendantFolder(userId: string, folderId: string, parentId: string) {
  let currentId: string | null = parentId;

  while (currentId) {
    if (currentId === folderId) {
      return true;
    }

    const current: { parentId: string | null } | null = await prisma.folder.findFirst({
      where: {
        id: currentId,
        userId,
        deletedAt: null,
      },
      select: { parentId: true },
    });

    currentId = current?.parentId ?? null;
  }

  return false;
}

export async function createFolderAction(formData: FormData) {
  const session = await requireSession();
  const name = readName(formData);
  const parentId = readParentId(formData);

  if (!name) {
    revalidatePath("/");
    return;
  }

  if (parentId && !await getActiveFolder(session.user.id, parentId)) {
    revalidatePath("/");
    return;
  }

  if (await hasSiblingName(session.user.id, parentId, name)) {
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

  if (!folder || await hasSiblingName(session.user.id, folder.parentId, name, folder.id)) {
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

  if (!folder || (parentId && !parent)) {
    revalidatePath("/");
    return;
  }

  if (
    parentId === folder.id ||
    (parentId && await isDescendantFolder(session.user.id, folder.id, parentId)) ||
    await hasSiblingName(session.user.id, parentId, folder.name, folder.id)
  ) {
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

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

export async function createFolderAction(formData: FormData) {
  const session = await requireSession();
  const name = readName(formData);

  if (!name) {
    revalidatePath("/");
    return;
  }

  const folder = await prisma.folder.create({
    data: {
      name,
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

  await prisma.folder.updateMany({
    where: {
      id: folderId,
      userId: session.user.id,
      deletedAt: null,
    },
    data: { name },
  });

  revalidatePath("/");
  redirect(`/?folder=${folderId}`);
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

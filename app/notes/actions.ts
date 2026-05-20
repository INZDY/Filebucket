"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function readId(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createNoteAction(formData: FormData) {
  const session = await requireSession();
  const folderId = readId(formData, "folderId");

  if (!folderId) {
    revalidatePath("/");
    return;
  }

  const folder = await prisma.folder.findFirst({
    where: {
      id: folderId,
      userId: session.user.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!folder) {
    revalidatePath("/");
    return;
  }

  const note = await prisma.note.create({
    data: {
      title: "Untitled note",
      body: "# Untitled note\n\nStart writing in Markdown.",
      folderId: folder.id,
      userId: session.user.id,
    },
  });

  revalidatePath("/");
  redirect(`/?folder=${folder.id}&note=${note.id}`);
}

export async function updateNoteAction(noteId: string, title: string, body: string) {
  const session = await requireSession();
  const nextTitle = title.trim().slice(0, 180) || "Untitled note";

  await prisma.note.updateMany({
    where: {
      id: noteId,
      userId: session.user.id,
      deletedAt: null,
      folder: {
        is: {
          deletedAt: null,
        },
      },
    },
    data: {
      title: nextTitle,
      body,
    },
  });

  revalidatePath("/");
}

export async function trashNoteAction(formData: FormData) {
  const session = await requireSession();
  const noteId = readId(formData, "noteId");
  const folderId = readId(formData, "folderId");

  if (!noteId) {
    revalidatePath("/");
    return;
  }

  await prisma.note.updateMany({
    where: {
      id: noteId,
      userId: session.user.id,
      deletedAt: null,
      folder: {
        is: {
          deletedAt: null,
        },
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/");
  redirect(folderId ? `/?folder=${folderId}` : "/");
}

export async function restoreNoteAction(formData: FormData) {
  const session = await requireSession();
  const noteId = readId(formData, "noteId");

  if (!noteId) {
    revalidatePath("/");
    return;
  }

  const note = await prisma.note.findFirst({
    where: {
      id: noteId,
      userId: session.user.id,
      deletedAt: { not: null },
      folder: {
        is: {
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      folderId: true,
    },
  });

  if (!note) {
    revalidatePath("/");
    redirect("/?view=trash");
  }

  await prisma.note.update({
    where: {
      id: note.id,
    },
    data: {
      deletedAt: null,
    },
  });

  revalidatePath("/");
  redirect(`/?folder=${note.folderId}&note=${note.id}`);
}

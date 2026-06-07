"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { namespaceManager } from "@/lib/namespace";

function readId(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function getActiveFolder(userId: string, folderId: string) {
  return prisma.folder.findFirst({
    where: {
      id: folderId,
      userId,
      deletedAt: null,
    },
    select: { id: true },
  });
}

export async function createNoteAction(formData: FormData) {
  const session = await requireSession();
  const folderId = readId(formData, "folderId") || null;
  const folder = folderId ? await getActiveFolder(session.user.id, folderId) : null;

  if (folderId && !folder) {
    revalidatePath("/");
    return;
  }

  const title = await namespaceManager.resolve(session.user.id, folder?.id ?? null, {
    type: "Note",
    name: "Untitled note",
  });
  const note = await prisma.note.create({
    data: {
      title,
      body: "# Untitled note\n\nStart writing in Markdown.",
      folderId: folder?.id,
      userId: session.user.id,
    },
  });

  revalidatePath("/");
  redirect(folder ? `/?folder=${folder.id}&note=${note.id}` : `/?note=${note.id}`);
}

export async function importMarkdownNotesAction(formData: FormData) {
  const session = await requireSession();
  const folderId = readId(formData, "folderId") || null;
  const folder = folderId ? await getActiveFolder(session.user.id, folderId) : null;

  if (folderId && !folder) {
    revalidatePath("/");
    return;
  }

  const files = formData.getAll("files").filter((file): file is File => file instanceof File);
  let firstImportedNote: { id: string } | null = null;

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    const importedTitle = file.name.replace(/\.md$/i, "").trim() || "Imported note";
    const title = await namespaceManager.resolve(session.user.id, folder?.id ?? null, {
      type: "Note",
      name: importedTitle,
    });
    const note = await prisma.note.create({
      data: {
        title,
        body: await file.text(),
        folderId: folder?.id,
        userId: session.user.id,
      },
      select: { id: true },
    });

    firstImportedNote ??= note;
  }

  revalidatePath("/");

  if (firstImportedNote) {
    redirect(folder ? `/?folder=${folder.id}&note=${firstImportedNote.id}` : `/?note=${firstImportedNote.id}`);
  }
}

export async function updateNoteAction(noteId: string, title: string, body: string) {
  const session = await requireSession();
  const nextTitle = title.trim().slice(0, 180) || "Untitled note";
  const note = await prisma.note.findFirst({
    where: {
      id: noteId,
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
    select: {
      id: true,
      folderId: true,
    },
  });

  if (!note) {
    return {
      ok: false,
      error: "Note is unavailable.",
    };
  }

  const validation = await namespaceManager.validate(session.user.id, note.folderId, {
    id: note.id,
    type: "Note",
    name: nextTitle,
  });

  if (!validation.isValid) {
    return {
      ok: false,
      error: "A note or media asset with this name already exists here.",
    };
  }

  await prisma.note.update({
    where: { id: note.id },
    data: {
      title: nextTitle,
      body,
    },
  });

  revalidatePath("/");

  return {
    ok: true,
  };
}

export async function moveNoteAction(formData: FormData) {
  const session = await requireSession();
  const noteId = readId(formData, "noteId");
  const folderId = readId(formData, "folderId") || null;

  if (!noteId) {
    revalidatePath("/");
    return;
  }

  const [note, folder] = await Promise.all([
    prisma.note.findFirst({
      where: {
        id: noteId,
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
      select: {
        id: true,
        title: true,
      },
    }),
    folderId ? getActiveFolder(session.user.id, folderId) : Promise.resolve(null),
  ]);

  if (!note || (folderId && !folder)) {
    revalidatePath("/");
    return;
  }

  const validation = await namespaceManager.validate(session.user.id, folder?.id ?? null, {
    id: note.id,
    type: "Note",
    name: note.title,
  });

  if (!validation.isValid) {
    revalidatePath("/");
    return;
  }

  await prisma.note.update({
    where: { id: note.id },
    data: {
      folderId: folder?.id ?? null,
    },
  });

  revalidatePath("/");
  redirect(folder ? `/?folder=${folder.id}&note=${note.id}` : `/?note=${note.id}`);
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
  redirect(note.folderId ? `/?folder=${note.folderId}&note=${note.id}` : `/?note=${note.id}`);
}

export async function renameNoteAction(formData: FormData) {
  const session = await requireSession();
  const noteId = readId(formData, "noteId");
  const newTitle = readId(formData, "name");

  if (!noteId || !newTitle) {
    revalidatePath("/");
    return;
  }

  const note = await prisma.note.findFirst({
    where: {
      id: noteId,
      userId: session.user.id,
      deletedAt: null,
    },
    select: {
      id: true,
      folderId: true,
      title: true,
    },
  });

  if (!note) {
    revalidatePath("/");
    return;
  }

  const validation = await namespaceManager.validate(session.user.id, note.folderId, {
    id: note.id,
    type: "Note",
    name: newTitle,
  });

  if (!validation.isValid) {
    revalidatePath("/");
    return;
  }

  await prisma.note.update({
    where: { id: note.id },
    data: {
      title: newTitle,
    },
  });

  revalidatePath("/");
  redirect(note.folderId ? `/?folder=${note.folderId}&note=${note.id}` : `/?note=${note.id}`);
}

export async function deleteNoteAction(formData: FormData) {
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
    },
  });

  if (!note) {
    revalidatePath("/");
    return;
  }

  await prisma.note.delete({
    where: { id: note.id },
  });

  revalidatePath("/");
  redirect("/?view=trash");
}

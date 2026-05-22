"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function readValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function slugifyTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function readReturnTo(formData: FormData) {
  const value = readValue(formData, "returnTo");

  return value.startsWith("/") ? value : "/";
}

export async function createTagAction(formData: FormData) {
  const session = await requireSession();
  const name = readValue(formData, "name").slice(0, 80);
  const noteId = readValue(formData, "noteId");
  const returnTo = readReturnTo(formData);
  const slug = slugifyTag(name);

  if (!name || !slug) {
    revalidatePath("/");
    redirect(returnTo);
  }

  const tag = await prisma.tag.upsert({
    where: {
      userId_slug: {
        userId: session.user.id,
        slug,
      },
    },
    update: {
      name,
    },
    create: {
      name,
      slug,
      userId: session.user.id,
    },
  });

  if (noteId) {
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: session.user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (note) {
      await prisma.noteTag.upsert({
        where: {
          noteId_tagId: {
            noteId: note.id,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          noteId: note.id,
          tagId: tag.id,
        },
      });
    }
  }

  revalidatePath("/");
  redirect(returnTo);
}

export async function toggleNoteTagAction(formData: FormData) {
  const session = await requireSession();
  const noteId = readValue(formData, "noteId");
  const tagId = readValue(formData, "tagId");
  const returnTo = readReturnTo(formData);

  if (!noteId || !tagId) {
    revalidatePath("/");
    redirect(returnTo);
  }

  const [note, tag] = await Promise.all([
    prisma.note.findFirst({
      where: {
        id: noteId,
        userId: session.user.id,
        deletedAt: null,
      },
      select: { id: true },
    }),
    prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: session.user.id,
      },
      select: { id: true },
    }),
  ]);

  if (!note || !tag) {
    revalidatePath("/");
    redirect(returnTo);
  }

  const existing = await prisma.noteTag.findUnique({
    where: {
      noteId_tagId: {
        noteId: note.id,
        tagId: tag.id,
      },
    },
  });

  if (existing) {
    await prisma.noteTag.delete({
      where: {
        noteId_tagId: {
          noteId: note.id,
          tagId: tag.id,
        },
      },
    });
  } else {
    await prisma.noteTag.create({
      data: {
        noteId: note.id,
        tagId: tag.id,
      },
    });
  }

  revalidatePath("/");
  redirect(returnTo);
}

export async function renameTagAction(formData: FormData) {
  const session = await requireSession();
  const tagId = readValue(formData, "tagId");
  const returnTo = readReturnTo(formData);
  const name = readValue(formData, "name").slice(0, 80);
  const slug = slugifyTag(name);

  if (!tagId || !name || !slug) {
    revalidatePath("/");
    redirect(returnTo);
  }

  const [tag, collision] = await Promise.all([
    prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: session.user.id,
      },
      select: { id: true },
    }),
    prisma.tag.findFirst({
      where: {
        userId: session.user.id,
        slug,
        id: {
          not: tagId,
        },
      },
      select: { id: true },
    }),
  ]);

  if (!tag || collision) {
    revalidatePath("/");
    redirect(returnTo);
  }

  await prisma.tag.update({
    where: { id: tag.id },
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/");
  redirect(`/?tag=${slug}`);
}

export async function deleteTagAction(formData: FormData) {
  const session = await requireSession();
  const tagId = readValue(formData, "tagId");

  if (!tagId) {
    revalidatePath("/");
    redirect("/");
  }

  await prisma.tag.deleteMany({
    where: {
      id: tagId,
      userId: session.user.id,
    },
  });

  revalidatePath("/");
  redirect("/");
}

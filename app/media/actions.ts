"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function readId(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function trashMediaAssetAction(formData: FormData) {
  const session = await requireSession();
  const mediaAssetId = readId(formData, "mediaAssetId");
  const folderId = readId(formData, "folderId");

  if (!mediaAssetId) {
    revalidatePath("/");
    return;
  }

  await prisma.mediaAsset.updateMany({
    where: {
      id: mediaAssetId,
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

export async function restoreMediaAssetAction(formData: FormData) {
  const session = await requireSession();
  const mediaAssetId = readId(formData, "mediaAssetId");

  if (!mediaAssetId) {
    revalidatePath("/");
    return;
  }

  const mediaAsset = await prisma.mediaAsset.findFirst({
    where: {
      id: mediaAssetId,
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

  if (!mediaAsset) {
    revalidatePath("/");
    redirect("/?view=trash");
  }

  await prisma.mediaAsset.update({
    where: {
      id: mediaAsset.id,
    },
    data: {
      deletedAt: null,
    },
  });

  revalidatePath("/");
  redirect(
    mediaAsset.folderId
      ? `/?folder=${mediaAsset.folderId}&media=${mediaAsset.id}`
      : `/?media=${mediaAsset.id}`,
  );
}

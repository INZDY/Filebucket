"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/r2";

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

function noteFilename(title: string) {
  const trimmedTitle = title.trim() || "Untitled note";

  return trimmedTitle.toLowerCase().endsWith(".md") ? trimmedTitle : `${trimmedTitle}.md`;
}

async function hasFilenameCollision(
  userId: string,
  folderId: string | null,
  filename: string,
  excludeMediaAssetId?: string,
) {
  const [notes, mediaAssets] = await Promise.all([
    prisma.note.findMany({
      where: {
        userId,
        folderId,
        deletedAt: null,
      },
      select: { title: true },
    }),
    prisma.mediaAsset.findMany({
      where: {
        userId,
        folderId,
        deletedAt: null,
        ...(excludeMediaAssetId
          ? {
              id: {
                not: excludeMediaAssetId,
              },
            }
          : {}),
      },
      select: { filename: true },
    }),
  ]);

  const normalizedFilename = filename.toLowerCase();

  return [
    ...notes.map((note) => noteFilename(note.title).toLowerCase()),
    ...mediaAssets.map((mediaAsset) => mediaAsset.filename.toLowerCase()),
  ].includes(normalizedFilename);
}

export async function moveMediaAssetAction(formData: FormData) {
  const session = await requireSession();
  const mediaAssetId = readId(formData, "mediaAssetId");
  const folderId = readId(formData, "folderId") || null;

  if (!mediaAssetId) {
    revalidatePath("/");
    return;
  }

  const [mediaAsset, folder] = await Promise.all([
    prisma.mediaAsset.findFirst({
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
      select: {
        id: true,
        filename: true,
      },
    }),
    folderId ? getActiveFolder(session.user.id, folderId) : Promise.resolve(null),
  ]);

  if (!mediaAsset || (folderId && !folder)) {
    revalidatePath("/");
    return;
  }

  if (await hasFilenameCollision(session.user.id, folder?.id ?? null, mediaAsset.filename, mediaAsset.id)) {
    revalidatePath("/");
    return;
  }

  await prisma.mediaAsset.update({
    where: { id: mediaAsset.id },
    data: {
      folderId: folder?.id ?? null,
    },
  });

  revalidatePath("/");
  redirect(folder ? `/?folder=${folder.id}&media=${mediaAsset.id}` : `/?media=${mediaAsset.id}`);
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

export async function getPresignedUploadUrlAction(filename: string, contentType: string) {
  const session = await requireSession();
  const userId = session.user.id;

  const uuid = crypto.randomUUID();
  const cleanFilename = filename.replace(/\s+/g, "_");
  const r2Key = `vaults/${userId}/${uuid}-${cleanFilename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || "",
    Key: r2Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return { uploadUrl, r2Key };
}

export async function createMediaAssetAction(data: {
  filename: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string;
  folderId: string | null;
  useAssetsFolder?: boolean;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  let resolvedFolderId = data.folderId;

  if (data.useAssetsFolder) {
    const existingFolder = await prisma.folder.findFirst({
      where: {
        userId,
        parentId: null,
        deletedAt: null,
        name: {
          equals: "assets",
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingFolder) {
      resolvedFolderId = existingFolder.id;
    } else {
      const newFolder = await prisma.folder.create({
        data: {
          name: "Assets",
          userId,
          parentId: null,
        },
        select: { id: true },
      });
      resolvedFolderId = newFolder.id;
    }
  }

  const folder = resolvedFolderId ? await getActiveFolder(userId, resolvedFolderId) : null;

  if (resolvedFolderId && !folder) {
    throw new Error("Invalid folder");
  }

  let finalFilename = data.filename;
  if (await hasFilenameCollision(userId, folder?.id ?? null, finalFilename)) {
    const extIndex = data.filename.lastIndexOf(".");
    const base = extIndex !== -1 ? data.filename.slice(0, extIndex) : data.filename;
    const ext = extIndex !== -1 ? data.filename.slice(extIndex) : "";
    let suffix = 2;
    finalFilename = `${base} ${suffix}${ext}`;
    while (await hasFilenameCollision(userId, folder?.id ?? null, finalFilename)) {
      suffix += 1;
      finalFilename = `${base} ${suffix}${ext}`;
    }
  }

  const mediaAsset = await prisma.mediaAsset.create({
    data: {
      userId,
      filename: finalFilename,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      r2Key: data.r2Key,
      folderId: folder?.id ?? null,
    },
  });

  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  const url = `${baseUrl}/${mediaAsset.r2Key.split("/").map(encodeURIComponent).join("/")}`;

  revalidatePath("/");
  return { id: mediaAsset.id, folderId: mediaAsset.folderId, filename: mediaAsset.filename, url };
}

export async function renameMediaAssetAction(formData: FormData) {
  const session = await requireSession();
  const mediaAssetId = readId(formData, "mediaAssetId");
  const newName = readId(formData, "name");

  if (!mediaAssetId || !newName) {
    revalidatePath("/");
    return;
  }

  const mediaAsset = await prisma.mediaAsset.findFirst({
    where: {
      id: mediaAssetId,
      userId: session.user.id,
      deletedAt: null,
    },
    select: {
      id: true,
      folderId: true,
      filename: true,
    },
  });

  if (!mediaAsset) {
    revalidatePath("/");
    return;
  }

  if (await hasFilenameCollision(session.user.id, mediaAsset.folderId, newName, mediaAsset.id)) {
    revalidatePath("/");
    return;
  }

  await prisma.mediaAsset.update({
    where: { id: mediaAsset.id },
    data: {
      filename: newName,
    },
  });

  revalidatePath("/");
  redirect(
    mediaAsset.folderId
      ? `/?folder=${mediaAsset.folderId}&media=${mediaAsset.id}`
      : `/?media=${mediaAsset.id}`
  );
}


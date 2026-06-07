import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageEngine } from "@/lib/storage";
import JSZip from "jszip";
import { namespaceManager } from "@/lib/namespace";

function getRelativePath(fromZipPath: string, toZipPath: string): string {
  const fromParts = fromZipPath.split("/");
  const toParts = toZipPath.split("/");

  // We want the relative path from the directory of fromZipPath to toZipPath
  const fromDirParts = fromParts.slice(0, -1);

  let commonLength = 0;
  while (
    commonLength < fromDirParts.length &&
    commonLength < toParts.length - 1 &&
    fromDirParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  const upsCount = fromDirParts.length - commonLength;
  const ups = "../".repeat(upsCount);
  const downs = toParts.slice(commonLength).join("/");

  return ups + downs;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Fetch active data
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
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
      prisma.mediaAsset.findMany({
        where: {
          userId,
          deletedAt: null,
        },
      }),
    ]);

    // 2. Resolve paths using VaultNamespaceManager
    const paths = await namespaceManager.resolveVaultPaths(userId);

    // 3. Build the ZIP archive
    const zip = new JSZip();

    // A. Add notes (with rewritten media references)
    for (const note of notes) {
      const notePath = paths.notes.get(note.id)!;
      const body = note.body;

      // Rewrite media references:
      // If it is an image: ![scale](filebucket-media:mediaId) -> ![unique_filename](relative_path)
      // If it is a link: [text](filebucket-media:mediaId) -> [text](relative_path)
      const rewrittenBody = body.replace(/(!?)\[([^\]]*)\]\(filebucket-media:([a-zA-Z0-9]+)\)/g, (match: string, isImage: string, label: string, mediaId: string) => {
        const mediaAssetPath = paths.mediaAssets.get(mediaId);
        if (mediaAssetPath) {
          const relativePath = getRelativePath(notePath, mediaAssetPath);
          if (isImage) {
            const uniqueFilename = mediaAssetPath.split("/").pop()!;
            return `![${uniqueFilename}](${relativePath})`;
          } else {
            return `[${label}](${relativePath})`;
          }
        }
        return match;
      });

      zip.file(notePath, rewrittenBody);
    }

    // B. Add media files from R2
    const failedMediaIds = new Set<string>();

    for (const media of mediaAssets) {
      const mediaPath = paths.mediaAssets.get(media.id)!;
      try {
        const fileBuffer = await storageEngine.downloadFile(media.r2Key);
        zip.file(mediaPath, fileBuffer);
      } catch (err) {
        console.error(`Failed to download media asset ${media.filename} (ID: ${media.id}):`, err);
        failedMediaIds.add(media.id);
      }
    }

    // C. Add metadata manifest
    const manifest = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        path: paths.folders.get(f.id)!,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        path: paths.notes.get(n.id)!,
        tags: n.tags.map((nt) => nt.tag.name),
        mediaReferences: Array.from(
          new Set(
            Array.from(n.body.matchAll(/filebucket-media:([a-zA-Z0-9]+)/g)).map((m) => m[1]),
          ),
        ),
      })),
      mediaAssets: mediaAssets.map((m) => ({
        id: m.id,
        filename: m.filename,
        path: paths.mediaAssets.get(m.id)!,
        contentType: m.contentType,
        sizeBytes: m.sizeBytes,
        downloadFailed: failedMediaIds.has(m.id) ? true : undefined,
      })),
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // Generate ZIP file buffer
    const zipBlob = await zip.generateAsync({ type: "blob" });

    return new Response(zipBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="filebucket-export.zip"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response("Export failed", { status: 500 });
  }
}

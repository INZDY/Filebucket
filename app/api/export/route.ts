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

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    let noteId: string | null = null;
    let chatFolderId: string | null = null;
    let folderId: string | null = null;

    if (req) {
      const { searchParams } = new URL(req.url);
      noteId = searchParams.get("noteId");
      chatFolderId = searchParams.get("chatFolderId");
      folderId = searchParams.get("folderId");
    }

    // 1. Contextual single note markdown export
    if (noteId) {
      const note = await prisma.note.findFirst({
        where: {
          id: noteId,
          userId,
          deletedAt: null,
        },
      });
      if (!note) {
        return new Response("Note not found", { status: 404 });
      }
      return new Response(note.body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${note.title}.md"`,
        },
      });
    }

    // 2. Contextual chat channel transcript markdown export
    if (chatFolderId) {
      const chatFolder = await prisma.folder.findFirst({
        where: {
          id: chatFolderId,
          userId,
          deletedAt: null,
        },
      });
      if (!chatFolder) {
        return new Response("Chat channel not found", { status: 404 });
      }
      const messages = await prisma.chatMessage.findMany({
        where: {
          folderId: chatFolderId,
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          mediaAssets: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              filename: true,
              r2Key: true,
            },
          },
        },
      });

      let transcript = `# Chat Transcript - ${chatFolder.name}\n\n`;
      for (const msg of messages) {
        const sender = msg.user?.name || msg.user?.email || "Unknown";
        const timestamp = msg.createdAt.toISOString();
        transcript += `### ${sender} - ${timestamp}\n`;
        transcript += `${msg.content}\n`;
        if (msg.mediaAssets && msg.mediaAssets.length > 0) {
          transcript += "\n";
          for (const asset of msg.mediaAssets) {
            transcript += `- Attachment: ${asset.filename}\n`;
          }
        }
        transcript += "\n";
      }

      return new Response(transcript, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${chatFolder.name}-transcript.md"`,
        },
      });
    }

    // 3. Fetch active data for zip compilation
    let targetFolder: { name: string } | null = null;
    if (folderId) {
      targetFolder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId,
          deletedAt: null,
        },
      });
      if (!targetFolder) {
        return new Response("Folder not found", { status: 404 });
      }
    }

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

    // Resolve paths using VaultNamespaceManager
    const paths = await namespaceManager.resolveVaultPaths(userId);

    // Filter items if folderId is specified
    let exportFolders = folders;
    let exportNotes = notes;
    let exportMediaAssets = mediaAssets;

    if (folderId && targetFolder) {
      const targetFolderZipPath = paths.folders.get(folderId);
      if (!targetFolderZipPath) {
        return new Response("Folder not found", { status: 404 });
      }
      const isDescendant = (path: string) => {
        return path === targetFolderZipPath || path.startsWith(targetFolderZipPath + "/");
      };
      exportFolders = folders.filter((f) => {
        const p = paths.folders.get(f.id);
        return p && isDescendant(p);
      });
      exportNotes = notes.filter((n) => {
        const p = paths.notes.get(n.id);
        return p && isDescendant(p);
      });
      exportMediaAssets = mediaAssets.filter((m) => {
        const p = paths.mediaAssets.get(m.id);
        return p && isDescendant(p);
      });
    }

    // 4. Build the ZIP archive
    const zip = new JSZip();

    // A. Add notes (with rewritten media references)
    for (const note of exportNotes) {
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

    for (const media of exportMediaAssets) {
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
      folders: exportFolders.map((f) => ({
        id: f.id,
        name: f.name,
        path: paths.folders.get(f.id)!,
      })),
      notes: exportNotes.map((n) => ({
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
      mediaAssets: exportMediaAssets.map((m) => ({
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

    const zipFilename = folderId && targetFolder ? `${targetFolder.name}.zip` : "filebucket-export.zip";

    return new Response(zipBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response("Export failed", { status: 500 });
  }
}

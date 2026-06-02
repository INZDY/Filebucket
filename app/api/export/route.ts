import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";

function sanitizeFilename(name: string): string {
  // Replace characters that are unsafe/invalid on common filesystems: \ / : * ? " < > |
  // Also remove control characters
  return name.replace(/[\\/:*?"<>|\x00-\x1F]/g, "_").trim();
}

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

    // 2. Build folder hierarchy paths top-down to resolve parent paths and collisions
    const childrenMap = new Map<string | null, typeof folders>();
    for (const folder of folders) {
      const pId = folder.parentId;
      if (!childrenMap.has(pId)) {
        childrenMap.set(pId, []);
      }
      childrenMap.get(pId)!.push(folder);
    }

    const folderPaths = new Map<string, string>(); // folderId -> relative path in zip (e.g. "Projects/Notes")

    function resolveFolderPathsRecursive(parentId: string | null, parentPath: string) {
      const children = childrenMap.get(parentId) || [];
      const usedNames = new Set<string>();

      for (const child of children) {
        const sanitized = sanitizeFilename(child.name) || "Untitled folder";
        let uniqueName = sanitized;
        let suffix = 2;
        while (usedNames.has(uniqueName.toLowerCase())) {
          uniqueName = `${sanitized} ${suffix}`;
          suffix++;
        }
        usedNames.add(uniqueName.toLowerCase());

        const childPath = parentPath ? `${parentPath}/${uniqueName}` : uniqueName;
        folderPaths.set(child.id, childPath);

        resolveFolderPathsRecursive(child.id, childPath);
      }
    }

    resolveFolderPathsRecursive(null, "");

    // 3. Group notes and media assets by folder location
    const notesByFolder = new Map<string | null, typeof notes>();
    for (const note of notes) {
      const fId = note.folderId;
      if (!notesByFolder.has(fId)) {
        notesByFolder.set(fId, []);
      }
      notesByFolder.get(fId)!.push(note);
    }

    const mediaByFolder = new Map<string | null, typeof mediaAssets>();
    for (const media of mediaAssets) {
      const fId = media.folderId;
      if (!mediaByFolder.has(fId)) {
        mediaByFolder.set(fId, []);
      }
      mediaByFolder.get(fId)!.push(media);
    }

    const notePaths = new Map<string, string>(); // noteId -> unique relative path (e.g. "Projects/Plan.md")
    const mediaPaths = new Map<string, string>(); // mediaId -> unique relative path (e.g. "Projects/photo.png")

    // 4. Resolve unique filenames for notes and media assets in each folder location
    const allLocations = [null, ...folders.map((f) => f.id)];

    for (const locationId of allLocations) {
      const folderPath = locationId ? folderPaths.get(locationId)! : "";
      const folderNotes = notesByFolder.get(locationId) || [];
      const folderMedia = mediaByFolder.get(locationId) || [];

      const usedNames = new Set<string>();

      // Add child folders in this location to usedNames to avoid file-folder collisions
      const childFolders = childrenMap.get(locationId) || [];
      for (const child of childFolders) {
        const childFolderName = folderPaths.get(child.id)!.split("/").pop()!;
        usedNames.add(childFolderName.toLowerCase());
      }

      function getUniqueFilename(baseName: string, extension: string): string {
        const sanitized = sanitizeFilename(baseName) || "Untitled";
        let candidate = extension ? `${sanitized}${extension}` : sanitized;
        let suffix = 2;
        while (usedNames.has(candidate.toLowerCase())) {
          candidate = extension ? `${sanitized} ${suffix}${extension}` : `${sanitized} ${suffix}`;
          suffix++;
        }
        usedNames.add(candidate.toLowerCase());
        return candidate;
      }

      // Process notes in this location
      for (const note of folderNotes) {
        const filename = getUniqueFilename(note.title, ".md");
        const zipPath = folderPath ? `${folderPath}/${filename}` : filename;
        notePaths.set(note.id, zipPath);
      }

      // Process media assets in this location
      for (const media of folderMedia) {
        const extIndex = media.filename.lastIndexOf(".");
        const base = extIndex !== -1 ? media.filename.slice(0, extIndex) : media.filename;
        const ext = extIndex !== -1 ? media.filename.slice(extIndex) : "";

        const filename = getUniqueFilename(base, ext);
        const zipPath = folderPath ? `${folderPath}/${filename}` : filename;
        mediaPaths.set(media.id, zipPath);
      }
    }

    // 5. Build the ZIP archive
    const zip = new JSZip();

    // A. Add notes (with rewritten media references)
    for (const note of notes) {
      const notePath = notePaths.get(note.id)!;
      const body = note.body;

      // Rewrite filebucket-media:mediaId to relative path inside the ZIP
      const rewrittenBody = body.replace(/filebucket-media:([a-zA-Z0-9]+)/g, (match, mediaId) => {
        const mediaAssetPath = mediaPaths.get(mediaId);
        if (mediaAssetPath) {
          return getRelativePath(notePath, mediaAssetPath);
        }
        return match;
      });

      zip.file(notePath, rewrittenBody);
    }

    // B. Add media files from R2
    const failedMediaIds = new Set<string>();

    for (const media of mediaAssets) {
      const mediaPath = mediaPaths.get(media.id)!;
      try {
        if (!process.env.R2_BUCKET_NAME) {
          throw new Error("R2_BUCKET_NAME is not configured");
        }

        const response = await s3.send(
          new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: media.r2Key,
          }),
        );

        if (response.Body) {
          const bytes = await response.Body.transformToByteArray();
          zip.file(mediaPath, Buffer.from(bytes));
        } else {
          throw new Error("Response body is empty");
        }
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
        path: folderPaths.get(f.id)!,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        path: notePaths.get(n.id)!,
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
        path: mediaPaths.get(m.id)!,
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

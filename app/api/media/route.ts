import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storageEngine } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return new Response("Missing key parameter", { status: 400 });
  }

  try {
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: {
        r2Key: key,
        userId: session.user.id,
      },
    });

    if (!mediaAsset) {
      return new Response("Not Found", { status: 404 });
    }

    const filename = mediaAsset.filename || "";
    const isArchiveOrBook =
      mediaAsset.contentType === "application/epub+zip" ||
      mediaAsset.contentType === "application/zip" ||
      mediaAsset.contentType === "application/x-zip-compressed" ||
      filename.endsWith(".epub") ||
      filename.endsWith(".zip") ||
      filename.endsWith(".cbz");

    if (isArchiveOrBook) {
      const buffer = await storageEngine.downloadFile(mediaAsset.r2Key);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": mediaAsset.contentType,
          "Content-Length": String(buffer.length),
          "Content-Disposition": `inline; filename="${encodeURIComponent(mediaAsset.filename)}"`,
        },
      });
    }

    const presignedUrl = await storageEngine.presignDownloadUrl(mediaAsset.r2Key);

    return Response.redirect(presignedUrl, 307);
  } catch (error) {
    console.error("Error serving media asset:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

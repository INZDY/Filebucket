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

    const fileBuffer = await storageEngine.downloadFile(mediaAsset.r2Key);

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": mediaAsset.contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving media asset:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

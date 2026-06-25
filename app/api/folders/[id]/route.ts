import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!folder) {
      return new Response("Folder not found", { status: 404 });
    }

    const [children, notes, mediaAssets] = await Promise.all([
      prisma.folder.findMany({
        where: {
          parentId: id,
          userId: session.user.id,
          deletedAt: null,
        },
        orderBy: [{ name: "asc" }],
      }),
      prisma.note.findMany({
        where: {
          folderId: id,
          userId: session.user.id,
          deletedAt: null,
        },
        orderBy: [{ title: "asc" }],
      }),
      prisma.mediaAsset.findMany({
        where: {
          folderId: id,
          userId: session.user.id,
          deletedAt: null,
        },
        orderBy: [{ filename: "asc" }],
      }),
    ]);

    return NextResponse.json({
      folder,
      children,
      notes,
      mediaAssets,
    });
  } catch (error) {
    console.error("Error fetching folder contents:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

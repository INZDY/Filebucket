import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");

  if (!folderId) {
    return new Response("Missing folderId parameter", { status: 400 });
  }

  try {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!folder) {
      return new Response("Forbidden", { status: 403 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        folderId,
        userId: session.user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        mediaAssets: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return Response.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, folderId, mediaAssetIds } = body;

    if (!folderId) {
      return new Response("Missing folderId parameter", { status: 400 });
    }

    if (content === undefined && (!mediaAssetIds || mediaAssetIds.length === 0)) {
      return new Response("Message content or media is required", { status: 400 });
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!folder) {
      return new Response("Forbidden", { status: 403 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        content: content || "",
        userId: session.user.id,
        folderId,
        mediaAssets: mediaAssetIds && mediaAssetIds.length > 0 ? {
          connect: mediaAssetIds.map((id: string) => ({ id })),
        } : undefined,
      },
      include: {
        mediaAssets: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return Response.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating chat message:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");

  if (!messageId) {
    return new Response("Missing messageId parameter", { status: 400 });
  }

  try {
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!message) {
      return new Response("Not Found", { status: 404 });
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting chat message:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

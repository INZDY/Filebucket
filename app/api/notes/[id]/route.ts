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
    const note = await prisma.note.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
          orderBy: {
            tag: {
              name: "asc",
            },
          },
        },
      },
    });

    if (!note) {
      return new Response("Note not found", { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

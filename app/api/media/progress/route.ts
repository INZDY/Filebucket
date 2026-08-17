import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mediaAssetId = searchParams.get("mediaAssetId");

  if (!mediaAssetId) {
    return NextResponse.json({ error: "Missing mediaAssetId parameter" }, { status: 400 });
  }

  const progress = await prisma.mediaProgress.findUnique({
    where: {
      userId_mediaAssetId: {
        userId: session.user.id,
        mediaAssetId,
      },
    },
  });

  if (!progress) {
    return NextResponse.json(null);
  }

  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mediaAssetId, position, percentage, volumeLevel, settings } = body;

    if (!mediaAssetId || position === undefined || percentage === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const progress = await prisma.mediaProgress.upsert({
      where: {
        userId_mediaAssetId: {
          userId: session.user.id,
          mediaAssetId,
        },
      },
      create: {
        userId: session.user.id,
        mediaAssetId,
        position: String(position),
        percentage: Number(percentage),
        volumeLevel: volumeLevel !== undefined ? Number(volumeLevel) : 1.0,
        settings: settings || undefined,
      },
      update: {
        position: String(position),
        percentage: Number(percentage),
        volumeLevel: volumeLevel !== undefined ? Number(volumeLevel) : undefined,
        settings: settings || undefined,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

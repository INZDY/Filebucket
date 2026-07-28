import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const aggregate = await prisma.mediaAsset.aggregate({
      where: {
        userId: session.user.id,
      },
      _sum: {
        sizeBytes: true,
      },
    });

    const usedBytes = aggregate._sum.sizeBytes || 0;
    return NextResponse.json({ usedBytes });
  } catch (error) {
    console.error("Error fetching storage usage:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

import { prisma } from "@/lib/prisma";

export async function initializeUserVault(userId: string): Promise<void> {
  const existingFolders = await prisma.folder.findMany({
    where: {
      userId,
      type: {
        in: ["NOTES_ROOT", "KEEP_ROOT", "CHAT_ROOT"],
      },
    },
  });

  const existingTypes = new Set(existingFolders.map((f) => f.type));

  if (!existingTypes.has("NOTES_ROOT")) {
    await prisma.folder.create({
      data: {
        name: "Notes",
        type: "NOTES_ROOT",
        userId,
        parentId: null,
      },
    });
  }

  if (!existingTypes.has("KEEP_ROOT")) {
    await prisma.folder.create({
      data: {
        name: "Quick Notes",
        type: "KEEP_ROOT",
        userId,
        parentId: null,
      },
    });
  }

  if (!existingTypes.has("CHAT_ROOT")) {
    await prisma.folder.create({
      data: {
        name: "Chat Channels",
        type: "CHAT_ROOT",
        userId,
        parentId: null,
      },
    });
  }
}

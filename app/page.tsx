import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializeUserVault } from "@/lib/user-init";
import { VaultDashboard } from "@/app/vault/vault-dashboard";

type HomeProps = {
  searchParams?: Promise<{
    folder?: string;
    note?: string;
    media?: string;
    view?: string;
    q?: string;
    tag?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const session = await requireSession();
  await initializeUserVault(session.user.id);
  const params = await searchParams;

  const [
    folders,
    deletedFolders,
    deletedNotes,
    deletedMediaAssets,
    tags,
    notes,
    mediaAssets,
  ] = await Promise.all([
    prisma.folder.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { children: true, mediaAssets: true, notes: true },
        },
      },
    }),
    prisma.folder.findMany({
      where: {
        userId: session.user.id,
        deletedAt: { not: null },
      },
      orderBy: [{ deletedAt: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { notes: true },
        },
        parent: {
          select: {
            deletedAt: true,
          },
        },
      },
    }),
    prisma.note.findMany({
      where: {
        userId: session.user.id,
        deletedAt: { not: null },
      },
      orderBy: [{ deletedAt: "desc" }, { title: "asc" }],
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
          },
        },
      },
    }),
    prisma.mediaAsset.findMany({
      where: {
        userId: session.user.id,
        deletedAt: { not: null },
      },
      orderBy: [{ deletedAt: "desc" }, { filename: "asc" }],
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
          },
        },
      },
    }),
    prisma.tag.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    }),
    prisma.note.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        OR: [
          { folderId: null },
          {
            folder: {
              is: {
                deletedAt: null,
              },
            },
          },
        ],
      },
      orderBy: [{ title: "asc" }],
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
    }),
    prisma.mediaAsset.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        OR: [
          { folderId: null },
          {
            folder: {
              is: {
                deletedAt: null,
              },
            },
          },
        ],
      },
      orderBy: [{ filename: "asc" }],
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="h-full overflow-hidden bg-[#0d0d11] text-slate-100">
      {/* PWA validation requirements: /icon.svg */}
      <VaultDashboard
        userId={session.user.id}
        initialFolders={folders}
        initialNotes={notes}
        initialMediaAssets={mediaAssets}
        initialTags={tags}
        initialDeletedFolders={deletedFolders}
        initialDeletedNotes={deletedNotes}
        initialDeletedMediaAssets={deletedMediaAssets}
        initialSearchParams={params ?? null}
      />
    </main>
  );
}

import {
  Cloud,
} from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageEngine } from "@/lib/storage";
import { getMediaAssetUrl } from "@/lib/utils";
import { initializeUserVault } from "@/lib/user-init";

import { SidebarBrowser } from "@/app/vault/sidebar-browser";
import { ActiveWorkspace } from "@/app/vault/active-workspace";
import { TrashWorkspace } from "@/app/vault/trash-workspace";

import { MainContentTabs } from "@/app/vault/main-content-tabs";
import { ResizableVault } from "@/app/vault/resizable-vault";
import { GlobalLoader } from "@/components/global-loader";
import { SearchInput } from "@/components/search-input";
import { HeaderHamburger } from "@/components/header-hamburger";
import { ActivityBar } from "@/components/activity-bar";
import { resolveViewMode } from "@/lib/mode";

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

type FolderListEntry = {
  id: string;
  name: string;
  parentId: string | null;
  _count: {
    children: number;
    mediaAssets: number;
    notes: number;
  };
};

function flattenFolders(folders: FolderListEntry[]) {
  const children = new Map<string | null, FolderListEntry[]>();

  for (const folder of folders) {
    const siblings = children.get(folder.parentId) ?? [];

    siblings.push(folder);
    children.set(folder.parentId, siblings);
  }

  const rows: { depth: number; folder: FolderListEntry }[] = [];

  function appendFolders(parentId: string | null, depth: number) {
    for (const folder of children.get(parentId) ?? []) {
      rows.push({ depth, folder });
      appendFolders(folder.id, depth + 1);
    }
  }

  appendFolders(null, 0);

  return rows;
}

function getFolderTrail(folders: FolderListEntry[], selectedFolder: FolderListEntry | null) {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const trail: FolderListEntry[] = [];
  let current = selectedFolder;

  while (current) {
    trail.unshift(current);
    current = current.parentId ? foldersById.get(current.parentId) ?? null : null;
  }

  return trail;
}

function getNoteOutline(body: string) {
  return body
    .split("\n")
    .map((line, index) => {
      const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());

      if (!heading) {
        return null;
      }

      return {
        id: `${index}-${heading[2]}`,
        depth: heading[1].length,
        title: heading[2].replace(/\s+#+$/, ""),
      };
    })
    .filter((heading): heading is { id: string; depth: number; title: string } => Boolean(heading));
}

function getContentHref({
  folderId,
  mediaId,
  noteId,
  query,
  tagSlug,
}: {
  folderId?: string | null;
  mediaId?: string;
  noteId?: string;
  query?: string;
  tagSlug?: string;
}) {
  const hrefParams = new URLSearchParams();

  if (folderId) {
    hrefParams.set("folder", folderId);
  }

  if (noteId) {
    hrefParams.set("note", noteId);
  }

  if (mediaId) {
    hrefParams.set("media", mediaId);
  }

  if (query) {
    hrefParams.set("q", query);
  }

  if (tagSlug && !mediaId) {
    hrefParams.set("tag", tagSlug);
  }

  return `/${hrefParams.toString() ? `?${hrefParams.toString()}` : ""}`;
}

// getMediaAssetUrl imported from @/lib/utils

function getMediaPreviewKind(contentType: string) {
  if (contentType.startsWith("image/")) {
    return "image";
  }

  if (contentType.startsWith("audio/")) {
    return "audio";
  }

  if (contentType.startsWith("video/")) {
    return "video";
  }

  if (contentType === "application/pdf") {
    return "pdf";
  }

  if (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/javascript"
  ) {
    return "text";
  }

  return "unsupported";
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await requireSession();
  await initializeUserVault(session.user.id);
  const params = await searchParams;
  const isTrashView = params?.view === "trash";
  const query = String(params?.q ?? "").trim();
  const activeTagSlug = String(params?.tag ?? "").trim();
  const isFilteredView = !isTrashView && Boolean(query || activeTagSlug);
  const renderKey = new Date().getTime();

  const [folders, deletedFolders, deletedNotes, deletedMediaAssets, tags] = await Promise.all([
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
  ]);

  const activeTag = activeTagSlug
    ? tags.find((tag) => tag.slug === activeTagSlug) ?? null
    : null;
  const selectedFolder =
    params?.folder ? folders.find((folder) => folder.id === params.folder) ?? null : null;

  const [notes, mediaAssets] = await Promise.all([
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
        ...(query
          ? {
              title: {
                contains: query,
                mode: "insensitive",
              },
            }
          : {}),
        ...(activeTag
          ? {
              tags: {
                some: {
                  tagId: activeTag.id,
                },
              },
            }
          : {}),
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
    activeTag
      ? Promise.resolve([])
      : prisma.mediaAsset.findMany({
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
            ...(query
              ? {
                  filename: {
                    contains: query,
                    mode: "insensitive",
                  },
                }
              : {}),
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

  const resolveDisplayMarkdown = (body: string) => {
    return body.replace(/filebucket-media:([a-zA-Z0-9]+)/g, (match, mediaId) => {
      const media = mediaAssets.find((m) => m.id === mediaId) || deletedMediaAssets.find((m) => m.id === mediaId);
      return media ? (getMediaAssetUrl(media.r2Key) ?? match) : match;
    });
  };

  const selectedNote =
    params?.note ? notes.find((note) => note.id === params.note) ?? null : null;
  const selectedMedia =
    params?.media ? mediaAssets.find((mediaAsset) => mediaAsset.id === params.media) ?? null : null;
  const selectedDeletedFolder =
    isTrashView && params?.folder
      ? deletedFolders.find((folder) => folder.id === params.folder) ?? null
      : null;
  const selectedDeletedNote =
    isTrashView && params?.note
      ? deletedNotes.find((note) => note.id === params.note) ?? null
      : null;
  const selectedDeletedMedia =
    isTrashView && params?.media
      ? deletedMediaAssets.find((mediaAsset) => mediaAsset.id === params.media) ?? null
      : null;

  let textPreviewContent = "";
  const activeMedia = selectedMedia || selectedDeletedMedia;
  if (activeMedia) {
    const previewKind = getMediaPreviewKind(activeMedia.contentType);
    if (previewKind === "text") {
      try {
        const fileBuffer = await storageEngine.downloadFile(activeMedia.r2Key);
        textPreviewContent = fileBuffer.toString("utf-8");
      } catch (err) {
        textPreviewContent = `Error loading text content: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }
  const matchingFolders = query && !activeTag
    ? folders.filter((folder) => folder.name.toLowerCase().includes(query.toLowerCase()))
    : [];
  const folderTrail = getFolderTrail(folders, selectedFolder);
  const noteOutline = selectedNote ? getNoteOutline(selectedNote.body) : [];
  const browserTitle = isTrashView
    ? "Trash"
    : activeTag
      ? `#${activeTag.name}`
      : query
        ? "Search results"
        : selectedFolder?.name ?? "Vault";
  const hasVaultContent = folders.length > 0 || notes.length > 0 || mediaAssets.length > 0;

  const currentPathParams = new URLSearchParams();

  if (params?.folder) {
    currentPathParams.set("folder", params.folder);
  }

  if (params?.note) {
    currentPathParams.set("note", params.note);
  }

  if (params?.media) {
    currentPathParams.set("media", params.media);
  }

  if (query) {
    currentPathParams.set("q", query);
  }

  if (activeTagSlug) {
    currentPathParams.set("tag", activeTagSlug);
  }

  const returnTo = `/${currentPathParams.toString() ? `?${currentPathParams.toString()}` : ""}`;
  const activeContentTab = selectedNote
    ? {
        id: selectedNote.id,
        type: "note" as const,
        title: selectedNote.title,
        href: getContentHref({
          folderId: selectedNote.folder?.id ?? null,
          noteId: selectedNote.id,
          query,
          tagSlug: activeTagSlug,
        }),
      }
    : selectedMedia
      ? {
          id: selectedMedia.id,
          type: "media" as const,
          title: selectedMedia.filename,
          href: getContentHref({
            folderId: selectedMedia.folder?.id ?? null,
            mediaId: selectedMedia.id,
            query,
          }),
        }
      : selectedDeletedNote
        ? {
            id: selectedDeletedNote.id,
            type: "note" as const,
            title: selectedDeletedNote.title,
            href: `/?view=trash&note=${selectedDeletedNote.id}`,
          }
        : selectedDeletedMedia
          ? {
              id: selectedDeletedMedia.id,
              type: "media" as const,
              title: selectedDeletedMedia.filename,
              href: `/?view=trash&media=${selectedDeletedMedia.id}`,
            }
          : selectedDeletedFolder
            ? {
                id: selectedDeletedFolder.id,
                type: "folder" as const,
                title: selectedDeletedFolder.name,
                href: `/?view=trash&folder=${selectedDeletedFolder.id}`,
              }
            : undefined;

  const existingIds = [
    ...folders.map((f) => f.id),
    ...notes.map((n) => n.id),
    ...mediaAssets.map((m) => m.id),
    ...deletedFolders.map((f) => f.id),
    ...deletedNotes.map((n) => n.id),
    ...deletedMediaAssets.map((m) => m.id),
  ];
  const contentFallbackHref = getContentHref({
    folderId: selectedNote?.folder?.id ?? selectedMedia?.folder?.id ?? selectedFolder?.id ?? null,
    query,
    tagSlug: activeTagSlug,
  });
  const trashCount = deletedFolders.length + deletedNotes.length + deletedMediaAssets.length;
  const folderRows = flattenFolders(folders);
  const folderDestinations = folderRows.map(({ folder, depth }) => ({
    id: folder.id,
    name: `${"  ".repeat(depth)}${folder.name}`,
  }));
  const isVaultRootActive = !isTrashView && !selectedFolder && !selectedNote && !selectedMedia;

  const imageMediaAssets = !isTrashView
    ? await prisma.mediaAsset.findMany({
        where: {
          userId: session.user.id,
          deletedAt: null,
          contentType: {
            startsWith: "image/",
          },
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
        orderBy: { filename: "asc" },
        include: {
          folder: {
            select: {
              name: true,
            },
          },
        },
      })
    : [];
  const deletedFolderContents = selectedDeletedFolder
    ? await Promise.all([
        prisma.folder.findMany({
          where: {
            userId: session.user.id,
            parentId: selectedDeletedFolder.id,
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            deletedAt: true,
          },
        }),
        prisma.note.findMany({
          where: {
            userId: session.user.id,
            folderId: selectedDeletedFolder.id,
          },
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
            deletedAt: true,
          },
        }),
        prisma.mediaAsset.findMany({
          where: {
            userId: session.user.id,
            folderId: selectedDeletedFolder.id,
          },
          orderBy: { filename: "asc" },
          select: {
            id: true,
            filename: true,
            contentType: true,
            deletedAt: true,
          },
        }),
      ])
    : null;

  const notesRoot = folders.find((f) => f.type === "NOTES_ROOT");
  const keepRoot = folders.find((f) => f.type === "KEEP_ROOT");
  const chatRoot = folders.find((f) => f.type === "CHAT_ROOT");

  const notesRootId = notesRoot?.id ?? null;
  const keepRootId = keepRoot?.id ?? null;
  const chatRootId = chatRoot?.id ?? null;

  const activeMode = resolveViewMode({
    selectedFolderId: params?.folder ?? null,
    selectedNoteId: params?.note ?? null,
    selectedMediaId: params?.media ?? null,
    folders,
    notes,
    mediaAssets,
  });

  return (
    <main className="h-screen overflow-hidden bg-[#0d0d11] text-slate-100">
      <GlobalLoader renderKey={renderKey} />
      <div className="flex h-screen flex-col overflow-hidden">
        <header className="flex min-h-14 flex-col gap-3 border-b border-slate-800/40 bg-[#101015]/60 backdrop-blur-md px-4 py-2.5 md:flex-row md:items-center md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <HeaderHamburger />
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-600/20 border border-purple-500/30 text-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.15)]">
              <Cloud className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-normal text-slate-50">Filebucket</h1>
              <p className="truncate text-xs text-slate-400">Personal note and file vault</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-auto w-full md:ml-12 md:mr-auto">
            <SearchInput defaultValue={query} disabled={isTrashView} />
          </div>

          <div className="hidden md:block w-28" />
        </header>

        <div className="flex flex-col-reverse md:flex-row flex-1 min-h-0 overflow-hidden">
          <ActivityBar
            activeMode={activeMode}
            notesRootId={notesRootId}
            keepRootId={keepRootId}
            chatRootId={chatRootId}
          />
          <ResizableVault
            browser={
              <SidebarBrowser
                userId={session.user.id}
                isTrashView={isTrashView}
                query={query}
                activeTagSlug={activeTagSlug}
                activeTag={activeTag}
                selectedFolder={selectedFolder}
                selectedNote={selectedNote}
                selectedMedia={selectedMedia}
                selectedDeletedFolder={selectedDeletedFolder}
                selectedDeletedNote={selectedDeletedNote}
                selectedDeletedMedia={selectedDeletedMedia}
                folders={folders}
                deletedFolders={deletedFolders}
                deletedNotes={deletedNotes}
                deletedMediaAssets={deletedMediaAssets}
                tags={tags}
                notes={notes}
                mediaAssets={mediaAssets}
                folderTrail={folderTrail}
                folderDestinations={folderDestinations}
                matchingFolders={matchingFolders}
                isFilteredView={isFilteredView}
                isVaultRootActive={isVaultRootActive}
                browserTitle={browserTitle}
                trashCount={trashCount}
                returnTo={returnTo}
                activeMode={activeMode}
              />
            }
            content={
              <section
                key="vault-content-pane"
                className="h-full min-h-0 overflow-hidden bg-[#111318] text-slate-100"
              >
                <MainContentTabs
                  activeTab={activeContentTab}
                  existingIds={existingIds}
                  fallbackHref={contentFallbackHref}
                  activeMode={activeMode}
                >
                  {isTrashView ? (
                    <TrashWorkspace
                      selectedDeletedNote={selectedDeletedNote}
                      selectedDeletedMedia={selectedDeletedMedia}
                      selectedDeletedFolder={selectedDeletedFolder}
                      deletedFolderContents={deletedFolderContents}
                      textPreviewContent={textPreviewContent}
                      resolveDisplayMarkdown={resolveDisplayMarkdown}
                    />
                  ) : activeMode === "KEEP" ? (
                    <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">
                      Keep Workspace Placeholder (Milestone 19)
                    </div>
                  ) : activeMode === "CHAT" ? (
                    <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">
                      Chat Workspace Placeholder (Milestone 20)
                    </div>
                  ) : (
                    <ActiveWorkspace
                      selectedNote={
                        selectedNote
                          ? {
                              ...selectedNote,
                              body: resolveDisplayMarkdown(selectedNote.body),
                            }
                          : null
                      }
                      selectedMedia={selectedMedia}
                      selectedFolder={selectedFolder}
                      folderTrail={folderTrail}
                      folderDestinations={folderDestinations}
                      imageMediaAssets={imageMediaAssets.map((mediaAsset) => ({
                        id: mediaAsset.id,
                        filename: mediaAsset.filename,
                        location: mediaAsset.folder?.name ?? "Vault",
                        url: getMediaAssetUrl(mediaAsset.r2Key) ?? "",
                      }))}
                      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
                      textPreviewContent={textPreviewContent}
                      hasVaultContent={hasVaultContent}
                      browserTitle={browserTitle}
                      allMediaAssets={mediaAssets}
                    />
                  )}
                </MainContentTabs>
              </section>
            }
            outline={selectedNote && !isTrashView ? (
              <aside
                key={`note-outline-${selectedNote.id}`}
                className="flex h-full min-h-0 flex-col border-l border-slate-800 bg-[#171a20] text-slate-100"
              >
                <div className="border-b border-slate-800 px-4 py-4">
                  <h2 className="text-sm font-semibold text-slate-100">Note Outline</h2>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  {noteOutline.length > 0 ? (
                    <div className="space-y-1">
                      {noteOutline.map((heading) => (
                        <div
                          key={heading.id}
                          className="truncate rounded-md px-2 py-1.5 text-sm text-slate-400"
                          style={{ paddingLeft: `${8 + (heading.depth - 1) * 12}px` }}
                        >
                          {heading.title}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-2 py-1.5 text-sm text-slate-500">No headings</p>
                  )}
                </div>
              </aside>
            ) : null}
          />
        </div>
      </div>
    </main>
  );
}

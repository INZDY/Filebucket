import Link from "next/link";
import {
  ArchiveRestore,
  BookOpenText,
  Cloud,
  Download,
  FileQuestion,
  FileText,
  Folder,
  ImagePlus,
  Music,
  Plus,
  Tags,
  Trash2,
  Video,
} from "lucide-react";

import {
  createFolderAction,
  restoreFolderAction,
} from "@/app/folders/actions";
import { BrowserTree } from "@/app/vault/browser-tree";
import { logoutAction } from "@/app/login/actions";
import { restoreMediaAssetAction } from "@/app/media/actions";
import { MediaActionsMenu } from "@/app/media/media-actions-menu";
import { MediaUploadControl } from "@/app/media/media-upload-control";
import {
  createNoteAction,
  importMarkdownNotesAction,
  moveNoteAction,
  restoreNoteAction,
  trashNoteAction,
} from "@/app/notes/actions";
import { NoteEditor } from "@/app/notes/note-editor";
import {
  deleteTagAction,
  renameTagAction,
} from "@/app/tags/actions";
import { MainContentTabs } from "@/app/vault/main-content-tabs";
import { ResizableVault } from "@/app/vault/resizable-vault";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/search-input";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

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

function getMediaAssetUrl(r2Key: string) {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/${r2Key.split("/").map(encodeURIComponent).join("/")}`;
}

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
  const params = await searchParams;
  const isTrashView = params?.view === "trash";
  const query = String(params?.q ?? "").trim();
  const activeTagSlug = String(params?.tag ?? "").trim();
  const isFilteredView = !isTrashView && Boolean(query || activeTagSlug);

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

  const [notes, mediaAssets] = !isTrashView
    ? await Promise.all([
        prisma.note.findMany({
          where: {
            userId: session.user.id,
            deletedAt: null,
            ...(isFilteredView
              ? {
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
                }
              : {
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
                }),
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
                ...(isFilteredView
                  ? {
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
                    }
                  : {
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
                    }),
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
      ])
    : [[], []];

  function resolveDisplayMarkdown(body: string) {
    return body.replace(/filebucket-media:([a-zA-Z0-9]+)/g, (match, mediaId) => {
      const media = mediaAssets.find((m) => m.id === mediaId) || deletedMediaAssets.find((m) => m.id === mediaId);
      return media ? (getMediaAssetUrl(media.r2Key) ?? match) : match;
    });
  }

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
      const previewUrl = getMediaAssetUrl(activeMedia.r2Key);
      if (previewUrl) {
        try {
          const res = await fetch(previewUrl, { cache: "no-store" });
          if (res.ok) {
            textPreviewContent = await res.text();
          } else {
            textPreviewContent = `Error loading text content: ${res.statusText}`;
          }
        } catch (err) {
          textPreviewContent = `Error loading text content: ${err instanceof Error ? err.message : String(err)}`;
        }
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
      : undefined;
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

  return (
    <main className="h-screen overflow-hidden bg-[#0d0d11] text-slate-100">
      <div className="flex h-screen flex-col overflow-hidden">
        <header className="flex min-h-14 flex-col gap-3 border-b border-slate-800/40 bg-[#101015]/60 backdrop-blur-md px-4 py-2.5 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-600/20 border border-purple-500/30 text-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.15)]">
              <Cloud className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-normal text-slate-50">Filebucket</h1>
              <p className="truncate text-xs text-slate-400">Personal note and file vault</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="hidden min-w-0 rounded-md border border-slate-700 bg-[#1b1f27] px-3 py-1.5 text-sm text-slate-400 md:block">
              <span className="block max-w-[220px] truncate">{session.email}</span>
            </div>
            <Button
              variant="outline"
              asChild
              className="w-full border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 sm:w-auto"
            >
              <a href="/api/export" download>
                <Download className="mr-2 h-4 w-4" />
                Export Vault
              </a>
            </Button>
            <form action={logoutAction}>
              <Button
                variant="outline"
                type="submit"
                className="w-full border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 sm:w-auto"
              >
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <ResizableVault
          browser={
            <aside
              key="vault-browser-pane"
              className="flex h-full min-h-0 flex-col border-b border-r border-slate-800 bg-[#171a20] text-slate-100 lg:border-b-0"
            >
              <div className="space-y-3 border-b border-slate-800 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">Vault Browser</p>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1 text-xs text-slate-400">
                    <Link className="hover:text-slate-100" href="/">
                      Vault
                    </Link>
                    {folderTrail.map((folder) => (
                      <span key={folder.id} className="flex min-w-0 items-center gap-1">
                        <span>/</span>
                        <Link className="max-w-32 truncate hover:text-slate-100" href={`/?folder=${folder.id}`}>
                          {folder.name}
                        </Link>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <form action={createNoteAction}>
                    <input type="hidden" name="folderId" value={selectedFolder?.id ?? ""} />
                    <Button aria-label="Create note" disabled={isTrashView} size="sm" type="submit">
                      <Plus className="h-4 w-4" />
                      New note
                    </Button>
                  </form>
                  <MediaUploadControl disabled={isTrashView} folderId={selectedFolder?.id ?? null} />
                </div>

                <form action={importMarkdownNotesAction} className="flex items-center gap-2">
                  <input type="hidden" name="folderId" value={selectedFolder?.id ?? ""} />
                  <Input
                    accept=".md,text/markdown"
                    className="h-9 border-slate-700 bg-[#111318] px-2 py-1 text-xs text-slate-100 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-slate-100"
                    disabled={isTrashView}
                    multiple
                    name="files"
                    type="file"
                  />
                  <Button
                    className="border-slate-700 bg-[#1f242c] text-slate-200 hover:bg-slate-800"
                    disabled={isTrashView}
                    size="sm"
                    type="submit"
                    variant="outline"
                  >
                    Import
                  </Button>
                </form>

                <form action={createFolderAction} className="flex gap-2">
                  <input type="hidden" name="parentId" value={selectedFolder?.id ?? ""} />
                  <Input
                    className="border-slate-700 bg-[#111318] text-slate-100 placeholder:text-slate-500"
                    name="name"
                    placeholder="New folder"
                    required
                    disabled={isTrashView}
                  />
                  <Button size="icon" aria-label="Create folder" disabled={isTrashView}>
                    <Folder className="h-4 w-4" />
                  </Button>
                </form>

                <SearchInput defaultValue={query} disabled={isTrashView} />

                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag) => {
                      const tagParams = new URLSearchParams();

                      if (query) {
                        tagParams.set("q", query);
                      }

                      if (activeTagSlug !== tag.slug) {
                        tagParams.set("tag", tag.slug);
                      }

                      const href = tagParams.toString() ? `/?${tagParams.toString()}` : "/";

                      return (
                        <Link key={tag.id} href={href}>
                          <Badge
                            className="gap-1 hover:bg-primary hover:text-primary-foreground"
                            variant={activeTagSlug === tag.slug ? "default" : "outline"}
                          >
                            <Tags className="h-3 w-3" />
                            {tag.name}
                            <span className="text-[10px] opacity-70">{tag._count.notes}</span>
                          </Badge>
                        </Link>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500">No tags yet</p>
                  )}
                </div>

                {activeTag ? (
                  <div className="flex flex-col gap-2 rounded-md border border-slate-700 bg-[#111318] p-2">
                    <form action={renameTagAction} className="flex gap-2">
                      <input type="hidden" name="tagId" value={activeTag.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Input aria-label="Rename tag" defaultValue={activeTag.name} name="name" required />
                      <Button size="sm" type="submit" variant="outline">
                        Rename
                      </Button>
                    </form>
                    <form action={deleteTagAction}>
                      <input type="hidden" name="tagId" value={activeTag.id} />
                      <Button className="w-full" size="sm" type="submit" variant="outline">
                        Delete tag
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {!isTrashView ? (
                  isFilteredView ? (
                    <nav className="space-y-1" aria-label={browserTitle}>
                      <p className="px-3 py-1 text-xs font-semibold uppercase text-slate-500">
                        {browserTitle}
                      </p>
                      {matchingFolders.map((folder) => (
                        <Link
                          key={`folder-result:${folder.id}`}
                          className="flex h-9 min-w-0 items-center gap-2 rounded-md px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-50"
                          href={`/?folder=${folder.id}`}
                        >
                          <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                          <span className="text-xs text-slate-500">
                            {folder._count ? folder._count.children + folder._count.notes + folder._count.mediaAssets : 0}
                          </span>
                        </Link>
                      ))}
                      {notes.map((note) => (
                        <Link
                          key={`note-result:${note.id}`}
                          className={cn(
                            "block rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-50",
                            selectedNote?.id === note.id && "bg-purple-600/15 text-purple-200 hover:bg-purple-600/20",
                          )}
                          href={getContentHref({
                            folderId: note.folder?.id ?? null,
                            noteId: note.id,
                            query,
                            tagSlug: activeTagSlug,
                          })}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate">{note.title}</span>
                          </span>
                          <span className="mt-1 block truncate pl-6 text-xs text-slate-500">
                            {note.folder?.name ?? "Vault"}
                          </span>
                        </Link>
                      ))}
                      {mediaAssets.map((mediaAsset) => (
                        <Link
                          key={`media-result:${mediaAsset.id}`}
                          className={cn(
                            "block rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-50",
                            selectedMedia?.id === mediaAsset.id && "bg-purple-600/15 text-purple-200 hover:bg-purple-600/20",
                          )}
                          href={getContentHref({
                            folderId: mediaAsset.folder?.id ?? null,
                            mediaId: mediaAsset.id,
                            query,
                          })}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <ImagePlus className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate">{mediaAsset.filename}</span>
                          </span>
                          <span className="mt-1 block truncate pl-6 text-xs text-slate-500">
                            {mediaAsset.folder?.name ?? "Vault"}
                          </span>
                        </Link>
                      ))}
                      {matchingFolders.length === 0 && notes.length === 0 && mediaAssets.length === 0 ? (
                        <div className="px-3 py-5 text-sm text-slate-500">No matching vault content</div>
                      ) : null}
                    </nav>
                  ) : (
                    <BrowserTree
                      folders={folders}
                      notes={notes}
                      mediaAssets={mediaAssets}
                      selectedFolderId={selectedFolder?.id ?? null}
                      selectedNoteId={selectedNote?.id ?? null}
                      selectedMediaId={selectedMedia?.id ?? null}
                      folderDestinations={folderDestinations}
                      isVaultRootActive={isVaultRootActive}
                    />
                  )
                ) : null}
              </div>

              <div className="border-t border-slate-800 px-4 py-4">
                <Button
                  asChild
                  variant={isTrashView ? "secondary" : "ghost"}
                  className={cn(
                    "h-10 w-full justify-start px-3",
                    isTrashView && "bg-purple-600/15 text-purple-200 hover:bg-purple-600/20",
                  )}
                >
                  <Link href="/?view=trash">
                    <ArchiveRestore className="h-4 w-4" />
                    <span className="flex-1 text-left">Trash</span>
                    <span className="text-xs text-muted-foreground">{trashCount}</span>
                  </Link>
                </Button>
              </div>
            </aside>
          }
          content={
            <section
              key="vault-content-pane"
              className="h-full min-h-0 overflow-hidden bg-[#111318] text-slate-100"
            >
              <MainContentTabs activeTab={activeContentTab} fallbackHref={contentFallbackHref}>
              {isTrashView ? (
                <div className="h-full overflow-y-auto bg-[#191c22]">
                  <div className="border-b border-slate-800 px-5 py-4">
                    <h2 className="text-base font-semibold tracking-normal text-slate-50">Trash</h2>
                    <p className="text-sm text-slate-400">Restore deleted folders and notes</p>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {trashCount > 0 ? (
                      <>
                        {deletedFolders.map((folder) => {
                          const parentDeleted = Boolean(folder.parent?.deletedAt);

                          return (
                            <div key={folder.id} className="flex items-center gap-3 px-4 py-4">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300">
                                <Trash2 className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <Link
                                  className="block truncate text-sm font-medium hover:text-primary"
                                  href={`/?view=trash&folder=${folder.id}`}
                                >
                                  {folder.name}
                                </Link>
                                <p className="text-xs text-slate-400">
                                  Folder deleted {folder.deletedAt ? formatDate(folder.deletedAt) : "recently"}
                                </p>
                                {parentDeleted ? (
                                  <p className="mt-1 text-xs text-amber-700">
                                    Restore the parent folder before restoring this folder.
                                  </p>
                                ) : null}
                              </div>
                              <form action={restoreFolderAction}>
                                <input type="hidden" name="folderId" value={folder.id} />
                                <Button variant="outline" size="sm" type="submit" disabled={parentDeleted}>
                                  Restore
                                </Button>
                              </form>
                            </div>
                          );
                        })}
                        {deletedNotes.map((note) => {
                          const folderDeleted = Boolean(note.folder?.deletedAt);

                          return (
                            <div key={note.id} className="flex items-center gap-3 px-4 py-4">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <Link
                                  className="block truncate text-sm font-medium hover:text-primary"
                                  href={`/?view=trash&note=${note.id}`}
                                >
                                  {note.title}
                                </Link>
                                <p className="truncate text-xs text-slate-400">
                                  Note in {note.folder?.name ?? "Vault"}
                                  {note.deletedAt ? ` deleted ${formatDate(note.deletedAt)}` : ""}
                                </p>
                                {folderDeleted ? (
                                  <p className="mt-1 text-xs text-amber-700">
                                    Restore the folder before restoring this note.
                                  </p>
                                ) : null}
                              </div>
                              <form action={restoreNoteAction}>
                                <input type="hidden" name="noteId" value={note.id} />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="submit"
                                  disabled={folderDeleted}
                                >
                                  Restore
                                </Button>
                              </form>
                            </div>
                          );
                        })}
                        {deletedMediaAssets.map((mediaAsset) => {
                          const folderDeleted = Boolean(mediaAsset.folder?.deletedAt);

                          return (
                            <div key={mediaAsset.id} className="flex items-center gap-3 px-4 py-4">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300">
                                <ImagePlus className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <Link
                                  className="block truncate text-sm font-medium hover:text-primary"
                                  href={`/?view=trash&media=${mediaAsset.id}`}
                                >
                                  {mediaAsset.filename}
                                </Link>
                                <p className="truncate text-xs text-slate-400">
                                  Media in {mediaAsset.folder?.name ?? "Vault"}
                                  {mediaAsset.deletedAt ? ` deleted ${formatDate(mediaAsset.deletedAt)}` : ""}
                                </p>
                                {folderDeleted ? (
                                  <p className="mt-1 text-xs text-amber-700">
                                    Restore the folder before restoring this media asset.
                                  </p>
                                ) : null}
                              </div>
                              <form action={restoreMediaAssetAction}>
                                <input type="hidden" name="mediaAssetId" value={mediaAsset.id} />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="submit"
                                  disabled={folderDeleted}
                                >
                                  Restore
                                </Button>
                              </form>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="px-4 py-10 text-center">
                        <p className="text-sm font-medium">Trash is empty</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Deleted folders, notes, and media will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedDeletedFolder && deletedFolderContents ? (
                    <div className="border-t border-slate-800 px-5 py-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Read-only folder</p>
                          <h3 className="mt-1 truncate text-lg font-semibold">{selectedDeletedFolder.name}</h3>
                        </div>
                        <form action={restoreFolderAction}>
                          <input type="hidden" name="folderId" value={selectedDeletedFolder.id} />
                          <Button
                            variant="outline"
                            type="submit"
                            disabled={Boolean(selectedDeletedFolder.parent?.deletedAt)}
                          >
                            Restore folder
                          </Button>
                        </form>
                      </div>
                      <div className="mt-4 divide-y rounded-md border">
                        {deletedFolderContents[0].map((folder) => (
                          <div key={folder.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                            <Folder className="h-4 w-4 text-slate-700" />
                            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                            {folder.deletedAt ? <Badge variant="outline">Trashed</Badge> : null}
                          </div>
                        ))}
                        {deletedFolderContents[1].map((note) => (
                          <div key={note.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                            <FileText className="h-4 w-4 text-slate-700" />
                            <span className="min-w-0 flex-1 truncate">{note.title}</span>
                            {note.deletedAt ? <Badge variant="outline">Trashed</Badge> : null}
                          </div>
                        ))}
                        {deletedFolderContents[2].map((mediaAsset) => (
                          <div key={mediaAsset.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                            <ImagePlus className="h-4 w-4 text-slate-700" />
                            <span className="min-w-0 flex-1 truncate">{mediaAsset.filename}</span>
                            <span className="text-xs text-muted-foreground">{mediaAsset.contentType}</span>
                            {mediaAsset.deletedAt ? <Badge variant="outline">Trashed</Badge> : null}
                          </div>
                        ))}
                        {deletedFolderContents.every((rows) => rows.length === 0) ? (
                          <div className="px-3 py-5 text-sm text-muted-foreground">This trashed folder is empty.</div>
                        ) : null}
                      </div>
                    </div>
                  ) : selectedDeletedNote ? (
                    <div className="border-t border-slate-800 px-5 py-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Read-only note</p>
                          <h3 className="mt-1 truncate text-lg font-semibold">{selectedDeletedNote.title}</h3>
                        </div>
                        <form action={restoreNoteAction}>
                          <input type="hidden" name="noteId" value={selectedDeletedNote.id} />
                          <Button variant="outline" type="submit" disabled={Boolean(selectedDeletedNote.folder?.deletedAt)}>
                            Restore note
                          </Button>
                        </form>
                      </div>
                      <div className="prose prose-slate mt-4 max-w-none rounded-md border bg-white px-4 py-4 text-sm leading-7 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-50 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                          {resolveDisplayMarkdown(selectedDeletedNote.body)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : selectedDeletedMedia ? (
                    <div className="border-t border-slate-800 px-5 py-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Read-only media</p>
                          <h3 className="mt-1 truncate text-lg font-semibold">{selectedDeletedMedia.filename}</h3>
                          <p className="text-sm text-muted-foreground">{selectedDeletedMedia.contentType}</p>
                        </div>
                        <form action={restoreMediaAssetAction}>
                          <input type="hidden" name="mediaAssetId" value={selectedDeletedMedia.id} />
                          <Button
                            variant="outline"
                            type="submit"
                            disabled={Boolean(selectedDeletedMedia.folder?.deletedAt)}
                          >
                            Restore media
                          </Button>
                        </form>
                      </div>
                      <div className="mt-4 rounded-md border bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
                        Media preview will be available after the upload and preview milestone wires R2 URLs.
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : selectedNote ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-slate-800 bg-[#191c22] px-5 py-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                          <BookOpenText className="h-4 w-4" />
                          <Link className="hover:text-slate-100" href="/">
                            Vault
                          </Link>
                          {folderTrail.map((folder) => (
                            <span key={folder.id} className="flex items-center gap-2">
                              <span>/</span>
                              <Link className="hover:text-slate-100" href={`/?folder=${folder.id}`}>
                                {folder.name}
                              </Link>
                            </span>
                          ))}
                          <span>/</span>
                          <span className="max-w-56 truncate">{selectedNote.title}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          Updated {formatDate(selectedNote.updatedAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={moveNoteAction} className="flex items-center gap-2">
                          <input type="hidden" name="noteId" value={selectedNote.id} />
                          <select
                            aria-label="Move note destination"
                            className="h-9 max-w-44 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            defaultValue={selectedNote.folder?.id ?? ""}
                            name="folderId"
                          >
                            <option value="">Vault</option>
                            {folderDestinations.map((destination) => (
                              <option key={destination.id} value={destination.id}>
                                {destination.name}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="outline">
                            Move
                          </Button>
                        </form>
                        <form action={trashNoteAction}>
                          <input type="hidden" name="noteId" value={selectedNote.id} />
                          <input type="hidden" name="folderId" value={selectedNote.folder?.id ?? ""} />
                          <Button variant="outline" type="submit">
                            <Trash2 className="h-4 w-4" />
                            Move to trash
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                  <NoteEditor
                    key={selectedNote.id}
                    imageMediaAssets={imageMediaAssets.map((mediaAsset) => ({
                      id: mediaAsset.id,
                      filename: mediaAsset.filename,
                      location: mediaAsset.folder?.name ?? "Vault",
                      url: getMediaAssetUrl(mediaAsset.r2Key) ?? "",
                    }))}
                    note={{
                      id: selectedNote.id,
                      title: selectedNote.title,
                      body: resolveDisplayMarkdown(selectedNote.body),
                    }}
                    allTags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
                    assignedTags={selectedNote.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name, slug: nt.tag.slug }))}
                  />
                </div>
              ) : selectedMedia ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-slate-800 bg-[#191c22] px-5 py-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                          <ImagePlus className="h-4 w-4" />
                          <Link className="hover:text-slate-100" href="/">
                            Vault
                          </Link>
                          {folderTrail.map((folder) => (
                            <span key={folder.id} className="flex items-center gap-2">
                              <span>/</span>
                              <Link className="hover:text-slate-100" href={`/?folder=${folder.id}`}>
                                {folder.name}
                              </Link>
                            </span>
                          ))}
                          <span>/</span>
                          <span className="max-w-56 truncate">{selectedMedia.filename}</span>
                        </div>
                        <h2 className="mt-1 truncate text-lg font-semibold tracking-normal">{selectedMedia.filename}</h2>
                        <p className="truncate text-sm text-slate-400">
                          {selectedMedia.contentType} · {Math.max(1, Math.round(selectedMedia.sizeBytes / 1024))} KB
                        </p>
                      </div>
                      <MediaActionsMenu
                        destinations={folderDestinations}
                        mediaAsset={{
                          id: selectedMedia.id,
                          filename: selectedMedia.filename,
                          folderId: selectedMedia.folder?.id ?? null,
                        }}
                      />
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto bg-[#101217] px-6 py-6">
                    <div className="flex min-h-full items-center justify-center">
                      {(() => {
                        const previewUrl = getMediaAssetUrl(selectedMedia.r2Key);
                        const previewKind = getMediaPreviewKind(selectedMedia.contentType);

                        if (previewKind === "image" && previewUrl) {
                          return (
                            <img
                              alt={selectedMedia.filename}
                              className="max-h-[calc(100vh-220px)] max-w-full object-contain"
                              src={previewUrl}
                            />
                          );
                        }

                        if (previewKind === "audio" && previewUrl) {
                          return (
                            <div className="w-full max-w-2xl rounded-md border border-slate-800 bg-[#191c22] p-5">
                              <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-800 text-slate-300">
                                  <Music className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-100">{selectedMedia.filename}</p>
                                  <p className="truncate text-xs text-slate-500">{selectedMedia.contentType}</p>
                                </div>
                              </div>
                              <audio className="w-full" controls src={previewUrl} />
                            </div>
                          );
                        }

                        if (previewKind === "video" && previewUrl) {
                          return (
                            <video
                              className="max-h-[calc(100vh-220px)] max-w-full rounded-md bg-black"
                              controls
                              src={previewUrl}
                            />
                          );
                        }

                        if (previewKind === "pdf" && previewUrl) {
                          return (
                            <iframe
                              src={previewUrl}
                              className="w-full h-full min-h-[calc(100vh-240px)] border-0 rounded-md bg-white shadow-md"
                            />
                          );
                        }

                        if (previewKind === "text" && previewUrl) {
                          return (
                            <div className="w-full max-w-4xl rounded-md border border-slate-800 bg-[#0d0d11]/80 backdrop-blur-md p-6 overflow-auto">
                              <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap text-left">
                                <code>{textPreviewContent}</code>
                              </pre>
                            </div>
                          );
                        }

                        const EmptyIcon = previewKind === "image" ? ImagePlus : previewKind === "audio" ? Music : previewKind === "video" ? Video : FileQuestion;

                        return (
                          <div className="w-full max-w-md rounded-md border border-slate-800 bg-[#191c22] p-6 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-800 text-slate-300">
                              <EmptyIcon className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-slate-100">{selectedMedia.filename}</p>
                            <p className="mt-1 text-sm text-slate-400">
                              {previewKind === "unsupported" ? "Preview unavailable" : "Media URL unavailable"}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-full items-center justify-center px-6 py-10">
                  <div className="max-w-md text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#191c22] text-slate-300 shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold tracking-normal">
                      {!selectedFolder && !hasVaultContent ? "Your vault is empty" : browserTitle}
                    </h2>
                  </div>
                </div>
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
    </main>
  );
}

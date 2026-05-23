import Link from "next/link";
import {
  ArchiveRestore,
  BookOpenText,
  Cloud,
  FileText,
  Folder,
  HardDriveUpload,
  ImagePlus,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react";

import {
  createFolderAction,
  restoreFolderAction,
} from "@/app/folders/actions";
import { FolderRow } from "@/app/folders/folder-row";
import { logoutAction } from "@/app/login/actions";
import { restoreMediaAssetAction, trashMediaAssetAction } from "@/app/media/actions";
import {
  createNoteAction,
  importMarkdownNotesAction,
  moveNoteAction,
  restoreNoteAction,
  trashNoteAction,
} from "@/app/notes/actions";
import { NoteEditor } from "@/app/notes/note-editor";
import {
  createTagAction,
  deleteTagAction,
  renameTagAction,
  toggleNoteTagAction,
} from "@/app/tags/actions";
import { MainContentTabs } from "@/app/vault/main-content-tabs";
import { ResizableVault } from "@/app/vault/resizable-vault";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
          select: { notes: true },
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
              : selectedFolder
                ? {
                    folderId: selectedFolder.id,
                  }
                : {
                    folderId: null,
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
          orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
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
                  : selectedFolder
                    ? {
                        folderId: selectedFolder.id,
                      }
                    : {
                        folderId: null,
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
              orderBy: [{ updatedAt: "desc" }, { filename: "asc" }],
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
    <main className="h-screen overflow-hidden bg-[#111318] text-slate-100">
      <div className="flex h-screen flex-col overflow-hidden">
        <header className="flex min-h-14 flex-col gap-3 border-b border-slate-800 bg-[#151820] px-4 py-2.5 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-500 text-slate-950 shadow-soft">
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
            <aside className="flex h-full min-h-0 flex-col border-b border-r border-slate-800 bg-[#171a20] text-slate-100 lg:border-b-0">
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
                  <Button
                    aria-label="Upload media"
                    className="border-slate-700 bg-[#1f242c] text-slate-300 hover:bg-slate-800 hover:text-slate-50"
                    disabled
                    size="icon"
                    title="Upload media"
                    type="button"
                    variant="outline"
                  >
                    <HardDriveUpload className="h-4 w-4" />
                  </Button>
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

                <form action="/" className="relative">
                  {activeTagSlug ? <input type="hidden" name="tag" value={activeTagSlug} /> : null}
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    className="border-slate-700 bg-[#111318] pl-9 text-slate-100 placeholder:text-slate-500"
                    defaultValue={query}
                    name="q"
                    placeholder="Search titles and folders"
                    disabled={isTrashView}
                  />
                </form>

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

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
                <nav className="space-y-1">
                  <Button
                    asChild
                    variant={!isTrashView && !selectedFolder ? "secondary" : "ghost"}
                    className={cn(
                      "h-10 w-full justify-start px-3",
                      !isTrashView && !selectedFolder && "bg-teal-500/15 text-teal-100 hover:bg-teal-500/20",
                    )}
                  >
                    <Link href="/">
                      <Folder className="h-4 w-4" />
                      Vault
                    </Link>
                  </Button>
                  {folderRows.map(({ depth, folder }) => {
                    const isActive = !isTrashView && selectedFolder?.id === folder.id;

                    return (
                      <FolderRow
                        key={folder.id}
                        folder={{
                          id: folder.id,
                          name: folder.name,
                          count: folder._count.notes,
                          parentId: folder.parentId,
                        }}
                        href={`/?folder=${folder.id}`}
                        isActive={isActive}
                        depth={depth}
                        destinations={folderDestinations}
                      />
                    );
                  })}
                </nav>

                {!isTrashView ? (
                  <section className="overflow-hidden rounded-md border border-slate-800 bg-[#141820]">
                    <div className="border-b border-slate-800 bg-[#1b1f27] px-3 py-2">
                      <h2 className="truncate text-xs font-semibold uppercase text-slate-400">
                        {browserTitle}
                      </h2>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {matchingFolders.map((folder) => (
                        <Link
                          key={folder.id}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-slate-800/70"
                          href={`/?folder=${folder.id}`}
                        >
                          <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                          <span className="text-xs text-slate-500">{folder._count.notes}</span>
                        </Link>
                      ))}
                      {notes.map((note) => {
                        const isActive = selectedNote?.id === note.id;
                        const noteHref = getContentHref({
                          folderId: note.folder?.id ?? null,
                          noteId: note.id,
                          query,
                          tagSlug: activeTagSlug,
                        });

                        return (
                          <Link
                            key={note.id}
                            className={cn(
                              "block px-3 py-2.5 text-sm transition-colors hover:bg-slate-800/70",
                              isActive && "bg-teal-500/15 hover:bg-teal-500/20",
                            )}
                            href={noteHref}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="min-w-0 flex-1 truncate font-medium">{note.title}</span>
                            </span>
                            {isFilteredView ? (
                              <span className="mt-1 block truncate pl-6 text-xs text-slate-500">
                                {note.folder?.name ?? "Vault"}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                      {mediaAssets.map((mediaAsset) => {
                        const isActive = selectedMedia?.id === mediaAsset.id;
                        const mediaHref = getContentHref({
                          folderId: mediaAsset.folder?.id ?? null,
                          mediaId: mediaAsset.id,
                          query,
                        });

                        return (
                          <Link
                            key={mediaAsset.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-slate-800/70",
                              isActive && "bg-teal-500/15 hover:bg-teal-500/20",
                            )}
                            href={mediaHref}
                          >
                            <ImagePlus className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate">{mediaAsset.filename}</span>
                          </Link>
                        );
                      })}
                      {matchingFolders.length === 0 && notes.length === 0 && mediaAssets.length === 0 ? (
                        <div className="px-3 py-5 text-sm text-slate-500">
                          {isFilteredView
                            ? "No matching vault content"
                            : !selectedFolder && !hasVaultContent
                              ? "Your vault is empty"
                              : "This location is empty"}
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </div>

              <div className="border-t border-slate-800 px-4 py-4">
                <Button
                  asChild
                  variant={isTrashView ? "secondary" : "ghost"}
                  className={cn(
                    "h-10 w-full justify-start px-3",
                    isTrashView && "bg-teal-500/15 text-teal-100 hover:bg-teal-500/20",
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
            <section className="h-full min-h-0 overflow-hidden bg-[#111318] text-slate-100">
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
                          {selectedDeletedNote.body}
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
                        <Button variant="outline">
                          <ImagePlus className="h-4 w-4" />
                          Insert image
                        </Button>
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

                    <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4">
                      <div className="flex flex-wrap gap-2">
                        {tags.length > 0 ? (
                          tags.map((tag) => {
                            const isAssigned = selectedNote.tags.some((noteTag) => noteTag.tagId === tag.id);

                            return (
                              <form key={tag.id} action={toggleNoteTagAction}>
                                <input type="hidden" name="noteId" value={selectedNote.id} />
                                <input type="hidden" name="tagId" value={tag.id} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant={isAssigned ? "secondary" : "outline"}
                                  className={cn(
                                    "h-8 gap-1",
                                    isAssigned && "bg-teal-500/15 text-teal-100 hover:bg-teal-500/20",
                                  )}
                                >
                                  <Tags className="h-3 w-3" />
                                  {tag.name}
                                </Button>
                              </form>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-400">Create a tag to classify this note.</p>
                        )}
                      </div>

                      <form action={createTagAction} className="flex max-w-md gap-2">
                        <input type="hidden" name="noteId" value={selectedNote.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <Input name="name" placeholder="New tag" />
                        <Button type="submit" variant="outline">
                          <Plus className="h-4 w-4" />
                          Add tag
                        </Button>
                      </form>
                    </div>
                  </div>
                  <NoteEditor
                    key={selectedNote.id}
                    note={{
                      id: selectedNote.id,
                      title: selectedNote.title,
                      body: selectedNote.body,
                    }}
                  />
                </div>
              ) : selectedMedia ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex flex-1 items-center justify-center px-6 py-10">
                    <div className="w-full max-w-xl rounded-md border border-slate-800 bg-[#191c22] p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-800 text-slate-300">
                          <ImagePlus className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold tracking-normal">{selectedMedia.filename}</h2>
                          <p className="truncate text-sm text-slate-400">{selectedMedia.contentType}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-800 bg-[#191c22] px-5 py-4">
                    <form action={trashMediaAssetAction} className="flex justify-end">
                      <input type="hidden" name="mediaAssetId" value={selectedMedia.id} />
                      <input type="hidden" name="folderId" value={selectedMedia.folder?.id ?? ""} />
                      <Button variant="outline" type="submit">
                        <Trash2 className="h-4 w-4" />
                        Move to trash
                      </Button>
                    </form>
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
            <aside className="flex h-full min-h-0 flex-col border-l border-slate-800 bg-[#171a20] text-slate-100">
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
          ) : undefined}
        />
      </div>
    </main>
  );
}

import Link from "next/link";
import {
  ArchiveRestore,
  BookOpenText,
  Cloud,
  FileText,
  Folder,
  ImagePlus,
  PanelLeft,
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
import {
  createNoteAction,
  restoreNoteAction,
  trashNoteAction,
} from "@/app/notes/actions";
import { NoteEditor } from "@/app/notes/note-editor";
import {
  createTagAction,
  toggleNoteTagAction,
} from "@/app/tags/actions";
import { ResizableVault } from "@/app/vault/resizable-vault";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type HomeProps = {
  searchParams?: Promise<{
    folder?: string;
    note?: string;
    view?: string;
    q?: string;
    tag?: string;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

type FolderListEntry = {
  id: string;
  name: string;
  parentId: string | null;
  _count: {
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

export default async function Home({ searchParams }: HomeProps) {
  const session = await requireSession();
  const params = await searchParams;
  const isTrashView = params?.view === "trash";
  const query = String(params?.q ?? "").trim();
  const activeTagSlug = String(params?.tag ?? "").trim();
  const isFilteredView = !isTrashView && Boolean(query || activeTagSlug);

  const [folders, deletedFolders, deletedNotes, tags] = await Promise.all([
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

  const notes = !isTrashView
    ? await prisma.note.findMany({
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
                folderId: selectedFolder?.id,
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
      })
    : [];

  const selectedNote =
    params?.note ? notes.find((note) => note.id === params.note) ?? null : null;

  const matchingFolders = query
    ? folders.filter((folder) => folder.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const activeTitle = isTrashView
    ? "Trash"
    : activeTag
      ? `#${activeTag.name}`
      : query
        ? "Search results"
        : selectedFolder?.name ?? "Vault";

  const currentPathParams = new URLSearchParams();

  if (params?.folder) {
    currentPathParams.set("folder", params.folder);
  }

  if (params?.note) {
    currentPathParams.set("note", params.note);
  }

  if (query) {
    currentPathParams.set("q", query);
  }

  if (activeTagSlug) {
    currentPathParams.set("tag", activeTagSlug);
  }

  const returnTo = `/${currentPathParams.toString() ? `?${currentPathParams.toString()}` : ""}`;
  const trashCount = deletedFolders.length + deletedNotes.length;
  const folderRows = flattenFolders(folders);
  const folderDestinations = folderRows.map(({ folder, depth }) => ({
    id: folder.id,
    name: `${"  ".repeat(depth)}${folder.name}`,
  }));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen flex-col">
        <header className="flex min-h-16 flex-col gap-3 border-b bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open folders">
              <PanelLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
              <Cloud className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-normal">Filebucket</h1>
              <p className="truncate text-sm text-muted-foreground">Personal note and file vault</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="hidden min-w-0 rounded-md border bg-slate-50 px-3 py-2 text-sm text-muted-foreground md:block">
              <span className="block max-w-[220px] truncate">{session.email}</span>
            </div>
            <form action={logoutAction}>
              <Button variant="outline" type="submit" className="w-full sm:w-auto">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <ResizableVault
          folders={
          <aside className="flex min-h-0 flex-col border-b border-r bg-white lg:border-b-0">
            <div className="space-y-3 border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Folders</p>
                <p className="text-xs text-muted-foreground">Primary organization</p>
              </div>
              <form action={createFolderAction} className="flex gap-2">
                <input type="hidden" name="parentId" value={selectedFolder?.id ?? ""} />
                <Input name="name" placeholder="New folder" required />
                <Button size="icon" aria-label="Create folder">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
              <Button
                asChild
                variant={!isTrashView && !selectedFolder ? "secondary" : "ghost"}
                className={cn(
                  "h-10 w-full justify-start px-3",
                  !isTrashView && !selectedFolder && "bg-teal-50 text-teal-950 hover:bg-teal-100",
                )}
              >
                <Link href="/">
                  <Folder className="h-4 w-4" />
                  Vault
                </Link>
              </Button>
              {folderRows.length > 0 ? (
                folderRows.map(({ depth, folder }) => {
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
                })
              ) : (
                <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  Create a folder in Vault to start organizing notes.
                </div>
              )}
            </nav>

            <div className="border-t px-4 py-4">
              <Button
                asChild
                variant={isTrashView ? "secondary" : "ghost"}
                className={cn(
                  "h-10 w-full justify-start px-3",
                  isTrashView && "bg-teal-50 text-teal-950 hover:bg-teal-100",
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
          items={
          <section className="min-h-0 border-r bg-white">
            <div className="space-y-3 border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-normal">{activeTitle}</h2>
                  <p className="text-sm text-muted-foreground">
                    {isTrashView ? "Restore deleted folders and notes" : "Notes and attachments"}
                  </p>
                </div>
                <form action={createNoteAction}>
                  <input type="hidden" name="folderId" value={selectedFolder?.id ?? ""} />
                  <Button aria-label="Create note" disabled={isTrashView} type="submit">
                    <Plus className="h-4 w-4" />
                    New note
                  </Button>
                </form>
              </div>

              <form action="/" className="relative">
                {activeTagSlug ? <input type="hidden" name="tag" value={activeTagSlug} /> : null}
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
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
                  <p className="text-xs text-muted-foreground">No tags yet</p>
                )}
              </div>
            </div>

            {isTrashView ? (
              <div className="divide-y">
                {trashCount > 0 ? (
                  <>
                    {deletedFolders.map((folder) => (
                      <div key={folder.id} className="flex items-center gap-3 px-4 py-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                          <Trash2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Folder deleted {folder.deletedAt ? formatDate(folder.deletedAt) : "recently"}
                          </p>
                        </div>
                        <form action={restoreFolderAction}>
                          <input type="hidden" name="folderId" value={folder.id} />
                          <Button variant="outline" size="sm" type="submit">
                            Restore
                          </Button>
                        </form>
                      </div>
                    ))}
                    {deletedNotes.map((note) => {
                      const folderDeleted = Boolean(note.folder?.deletedAt);

                      return (
                        <div key={note.id} className="flex items-center gap-3 px-4 py-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{note.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
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
                  </>
                ) : (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-medium">Trash is empty</p>
                    <p className="mt-1 text-sm text-muted-foreground">Deleted folders and notes will appear here.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {matchingFolders.length > 0 ? (
                  matchingFolders.map((folder) => (
                    <Link
                      key={folder.id}
                      className="flex gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50"
                      href={`/?folder=${folder.id}`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                        <Folder className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-sm font-medium">{folder.name}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {folder._count.notes} notes
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Folder</p>
                      </div>
                    </Link>
                  ))
                ) : null}

                {notes.length > 0 ? (
                  notes.map((note) => {
                    const isActive = selectedNote?.id === note.id;
                    const noteHref = `${note.folder ? `/?folder=${note.folder.id}` : "/?"}&note=${note.id}${
                      query ? `&q=${encodeURIComponent(query)}` : ""
                    }${activeTagSlug ? `&tag=${encodeURIComponent(activeTagSlug)}` : ""}`;

                    return (
                      <Link
                        key={note.id}
                        className={cn(
                          "flex gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50",
                          isActive && "bg-teal-50/70 hover:bg-teal-50",
                        )}
                        href={noteHref}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                            isActive ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-700",
                          )}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-medium">{note.title}</p>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(note.updatedAt)}</span>
                          </div>
                          {isFilteredView ? (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {note.folder?.name ?? "Vault"}
                            </p>
                          ) : null}
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {note.body.replaceAll("#", "").replaceAll("-", "").trim() || "Empty note"}
                          </p>
                          {note.tags.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {note.tags.map(({ tag }) => (
                                <Badge key={tag.id} variant="outline" className="px-1.5 py-0 text-[10px]">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })
                ) : matchingFolders.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-medium">
                      {isFilteredView
                        ? "No matching notes or folders"
                        : selectedFolder
                          ? "No notes in this folder yet"
                          : "No notes in Vault yet"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isFilteredView
                        ? "Try a different title search or tag filter."
                        : selectedFolder
                          ? "Create a Markdown note to start writing in this folder."
                          : "Create a Markdown note or folder in Vault."}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </section>
          }
          detail={
          <section className="min-h-0 bg-slate-50">
            {selectedNote && !isTrashView ? (
              <div className="flex min-h-full flex-col">
                <div className="border-b bg-white px-5 py-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <BookOpenText className="h-4 w-4" />
                        <span>{selectedNote.folder?.name ?? "Vault"}</span>
                        <span>/</span>
                        <span>Markdown note</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Updated {formatDate(selectedNote.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline">
                        <ImagePlus className="h-4 w-4" />
                        Insert image
                      </Button>
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

                  <div className="mt-4 flex flex-col gap-3 border-t pt-4">
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
                                  isAssigned && "bg-teal-50 text-teal-950 hover:bg-teal-100",
                                )}
                              >
                                <Tags className="h-3 w-3" />
                                {tag.name}
                              </Button>
                            </form>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">Create a tag to classify this note.</p>
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
            ) : null}
          </section>
          }
        />
      </div>
    </main>
  );
}

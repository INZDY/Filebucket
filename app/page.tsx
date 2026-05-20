import Link from "next/link";
import {
  ArchiveRestore,
  BookOpenText,
  Cloud,
  FileText,
  ImagePlus,
  MoreHorizontal,
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
import { createNoteAction } from "@/app/notes/actions";
import { NoteEditor } from "@/app/notes/note-editor";
import { ResizableVault } from "@/app/vault/resizable-vault";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const tags = ["planning", "research", "images", "draft"];

type HomeProps = {
  searchParams?: Promise<{
    folder?: string;
    note?: string;
    view?: string;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await requireSession();
  const params = await searchParams;
  const isTrashView = params?.view === "trash";

  const [folders, deletedFolders] = await Promise.all([
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
  ]);

  const selectedFolder =
    folders.find((folder) => folder.id === params?.folder) ?? folders[0] ?? null;

  const notes = selectedFolder && !isTrashView
    ? await prisma.note.findMany({
        where: {
          userId: session.user.id,
          folderId: selectedFolder.id,
          deletedAt: null,
        },
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      })
    : [];

  const selectedNote =
    params?.note ? notes.find((note) => note.id === params.note) ?? null : null;

  const activeTitle = isTrashView
    ? "Trash"
    : selectedFolder?.name ?? "No folder selected";

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
                <Input name="name" placeholder="New folder" required />
                <Button size="icon" aria-label="Create folder">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
              {folders.length > 0 ? (
                folders.map((folder) => {
                  const isActive = !isTrashView && selectedFolder?.id === folder.id;

                  return (
                    <FolderRow
                      key={folder.id}
                      folder={{
                        id: folder.id,
                        name: folder.name,
                        count: folder._count.notes,
                      }}
                      href={`/?folder=${folder.id}`}
                      isActive={isActive}
                    />
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  Create your first folder to start organizing notes.
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
                  <span className="text-xs text-muted-foreground">{deletedFolders.length}</span>
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
                    {isTrashView ? "Restore deleted folders" : "Notes and attachments"}
                  </p>
                </div>
                <form action={createNoteAction}>
                  <input type="hidden" name="folderId" value={selectedFolder?.id ?? ""} />
                  <Button aria-label="Create note" disabled={!selectedFolder || isTrashView} type="submit">
                    <Plus className="h-4 w-4" />
                    New note
                  </Button>
                </form>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search titles and filenames" disabled={isTrashView} />
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant={tag === "planning" ? "default" : "outline"}>
                    <Tags className="mr-1 h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {isTrashView ? (
              <div className="divide-y">
                {deletedFolders.length > 0 ? (
                  deletedFolders.map((folder) => (
                    <div key={folder.id} className="flex items-center gap-3 px-4 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                        <Trash2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Deleted {folder.deletedAt ? formatDate(folder.deletedAt) : "recently"}
                        </p>
                      </div>
                      <form action={restoreFolderAction}>
                        <input type="hidden" name="folderId" value={folder.id} />
                        <Button variant="outline" size="sm" type="submit">
                          Restore
                        </Button>
                      </form>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-medium">Trash is empty</p>
                    <p className="mt-1 text-sm text-muted-foreground">Deleted folders will appear here.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {notes.length > 0 ? (
                  notes.map((note) => {
                    const isActive = selectedNote?.id === note.id;

                    return (
                      <Link
                        key={note.id}
                        className={cn(
                          "flex gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50",
                          isActive && "bg-teal-50/70 hover:bg-teal-50",
                        )}
                        href={`/?folder=${selectedFolder?.id}&note=${note.id}`}
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
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {note.body.replaceAll("#", "").replaceAll("-", "").trim() || "Empty note"}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-medium">
                      {selectedFolder ? "No notes in this folder yet" : "No folder selected"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedFolder
                        ? "Create a Markdown note to start writing in this folder."
                        : "Create a folder to start building your vault."}
                    </p>
                  </div>
                )}
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
                        <span>{selectedFolder?.name ?? "Vault"}</span>
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
                      <Button variant="outline" size="icon" aria-label="More note actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
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

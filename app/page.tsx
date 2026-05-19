import {
  ArchiveRestore,
  BookOpenText,
  Cloud,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  ImagePlus,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Search,
  Tags,
} from "lucide-react";

import { logoutAction } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const folders = [
  { name: "Inbox", count: 7, active: true },
  { name: "Projects", count: 12 },
  { name: "References", count: 18 },
  { name: "Journal", count: 31 },
  { name: "Media", count: 9 },
];

const tags = ["planning", "research", "images", "draft"];

const items = [
  {
    title: "Filebucket MVP outline",
    kind: "Markdown note",
    updated: "Today",
    icon: FileText,
    active: true,
    tags: ["planning", "draft"],
  },
  {
    title: "R2 upload references",
    kind: "Markdown note",
    updated: "Yesterday",
    icon: FileText,
    tags: ["research"],
  },
  {
    title: "vault-shell.png",
    kind: "Image",
    updated: "May 18",
    icon: FileImage,
    tags: ["images"],
  },
  {
    title: "Backup format notes",
    kind: "Markdown note",
    updated: "May 16",
    icon: FileText,
    tags: ["planning"],
  },
];

const activeNote = {
  title: "Filebucket MVP outline",
  folder: "Inbox",
  updated: "Today at 14:20",
  tags: ["planning", "draft"],
  body: [
    "# Filebucket MVP outline",
    "",
    "Build the app around a simple personal vault loop: choose a folder, open a note, edit Markdown, and attach supporting media when needed.",
    "",
    "## Current slice",
    "- Replace the placeholder dashboard with the real vault shell.",
    "- Keep folders as the primary navigation surface.",
    "- Keep search focused on note titles and filenames first.",
    "",
    "## Next slice",
    "- Create folders from the sidebar.",
    "- Create notes inside the selected folder.",
    "- Save note edits to PostgreSQL.",
  ],
};

export default async function Home() {
  const session = await requireSession();

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

        <div className="grid flex-1 lg:grid-cols-[260px_minmax(320px,420px)_1fr]">
          <aside className="hidden min-h-0 border-r bg-white lg:flex lg:flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Folders</p>
                <p className="text-xs text-muted-foreground">Primary organization</p>
              </div>
              <Button variant="outline" size="icon" aria-label="Create folder">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
              {folders.map((folder) => (
                <Button
                  key={folder.name}
                  variant={folder.active ? "secondary" : "ghost"}
                  className={cn(
                    "h-10 w-full justify-start px-3",
                    folder.active && "bg-teal-50 text-teal-950 hover:bg-teal-100",
                  )}
                >
                  {folder.active ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                  <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
                  <span className="text-xs text-muted-foreground">{folder.count}</span>
                </Button>
              ))}
            </nav>

            <div className="border-t px-4 py-4">
              <Button variant="ghost" className="h-10 w-full justify-start px-3">
                <ArchiveRestore className="h-4 w-4" />
                Trash
              </Button>
            </div>
          </aside>

          <section className="min-h-0 border-r bg-white">
            <div className="space-y-3 border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-normal">Inbox</h2>
                  <p className="text-sm text-muted-foreground">Notes and attachments</p>
                </div>
                <Button aria-label="Create note">
                  <Plus className="h-4 w-4" />
                  New note
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search titles and filenames" />
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

            <div className="divide-y">
              {items.map((item) => (
                <button
                  key={item.title}
                  className={cn(
                    "flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50",
                    item.active && "bg-teal-50/70 hover:bg-teal-50",
                  )}
                  type="button"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                      item.active ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-700",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.updated}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.kind}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-white px-1.5 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="min-h-0 bg-slate-50">
            <div className="flex min-h-full flex-col">
              <div className="border-b bg-white px-5 py-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <BookOpenText className="h-4 w-4" />
                      <span>{activeNote.folder}</span>
                      <span>/</span>
                      <span>Markdown note</span>
                    </div>
                    <h2 className="mt-2 truncate text-2xl font-semibold tracking-normal">{activeNote.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Updated {activeNote.updated}</p>
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

                <div className="mt-4 flex flex-wrap gap-2">
                  {activeNote.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="border-b bg-white lg:border-b-0 lg:border-r">
                  <div className="flex h-11 items-center justify-between border-b px-5">
                    <p className="text-sm font-medium">Editor</p>
                    <span className="text-xs text-muted-foreground">Autosave ready</span>
                  </div>
                  <div className="px-5 py-4">
                    <pre className="min-h-[420px] whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                      {activeNote.body.join("\n")}
                    </pre>
                  </div>
                </div>

                <div className="bg-slate-50">
                  <div className="flex h-11 items-center justify-between border-b bg-white px-5">
                    <p className="text-sm font-medium">Preview</p>
                    <span className="text-xs text-muted-foreground">Markdown</span>
                  </div>
                  <article className="mx-auto max-w-2xl px-5 py-6">
                    <h1 className="text-3xl font-semibold tracking-normal">Filebucket MVP outline</h1>
                    <p className="mt-4 text-sm leading-6 text-slate-700">
                      Build the app around a simple personal vault loop: choose a folder, open a note, edit Markdown, and attach supporting media when needed.
                    </p>

                    <Separator className="my-6" />

                    <h2 className="text-lg font-semibold tracking-normal">Current slice</h2>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                      <li>Replace the placeholder dashboard with the real vault shell.</li>
                      <li>Keep folders as the primary navigation surface.</li>
                      <li>Keep search focused on note titles and filenames first.</li>
                    </ul>

                    <h2 className="mt-8 text-lg font-semibold tracking-normal">Next slice</h2>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                      <li>Create folders from the sidebar.</li>
                      <li>Create notes inside the selected folder.</li>
                      <li>Save note edits to PostgreSQL.</li>
                    </ul>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  Folder,
  ImagePlus,
  RotateCcw,
  Tags,
  Trash,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientForm } from "@/components/client-form";
import { ConfirmForm } from "@/components/confirm-form";
import { BrowserToolbar } from "./browser-toolbar";
import { BrowserTree } from "./browser-tree";
import { cn } from "@/lib/utils";
import { compareAlphanumeric } from "@/lib/sorting";

import {
  restoreFolderAction,
  deleteFolderAction,
  emptyTrashAction,
} from "@/app/folders/actions";
import {
  restoreNoteAction,
  deleteNoteAction,
} from "@/app/notes/actions";
import {
  restoreMediaAssetAction,
  deleteMediaAssetAction,
} from "@/app/media/actions";
import {
  deleteTagAction,
  renameTagAction,
} from "@/app/tags/actions";

type FolderEntry = {
  id: string;
  name: string;
  parentId: string | null;
  type?: string;
  _count?: {
    children?: number;
    mediaAssets?: number;
    notes?: number;
  };
};

type NoteEntry = {
  id: string;
  title: string;
  folderId: string | null;
  folder?: {
    id: string;
    name: string;
  } | null;
};

type MediaEntry = {
  id: string;
  filename: string;
  folderId: string | null;
  folder?: {
    id: string;
    name: string;
  } | null;
};

type TagEntry = {
  id: string;
  name: string;
  slug: string;
  _count: {
    notes: number;
  };
};

interface SidebarBrowserProps {
  userId: string;
  isTrashView: boolean;
  query: string;
  activeTagSlug: string;
  activeTag: TagEntry | null;
  selectedFolder: FolderEntry | null;
  selectedNote: NoteEntry | null;
  selectedMedia: MediaEntry | null;
  selectedDeletedFolder: FolderEntry | null;
  selectedDeletedNote: NoteEntry | null;
  selectedDeletedMedia: MediaEntry | null;
  
  folders: FolderEntry[];
  deletedFolders: (FolderEntry & { parent?: { deletedAt: Date | string | null } | null })[];
  deletedNotes: (NoteEntry & { folder?: { name: string; deletedAt: Date | string | null } | null })[];
  deletedMediaAssets: (MediaEntry & { contentType: string; sizeBytes: number; folder?: { name: string; deletedAt: Date | string | null } | null })[];
  tags: TagEntry[];
  notes: NoteEntry[];
  mediaAssets: MediaEntry[];
  
  folderTrail: FolderEntry[];
  folderDestinations: { id: string; name: string }[];
  matchingFolders: FolderEntry[];
  isFilteredView: boolean;
  isVaultRootActive: boolean;
  browserTitle: string;
  trashCount: number;
  returnTo: string;
  activeMode: "FILES" | "NOTES" | "KEEP" | "CHAT" | "TRASH";
}

export function SidebarBrowser({
  activeTag,
  activeTagSlug,
  browserTitle,
  deletedFolders,
  deletedMediaAssets,
  deletedNotes,
  folderDestinations,
  folders,
  folderTrail,
  isFilteredView,
  isTrashView,
  isVaultRootActive,
  matchingFolders,
  mediaAssets,
  notes,
  query,
  returnTo,
  selectedDeletedFolder,
  selectedDeletedMedia,
  selectedDeletedNote,
  selectedFolder,
  selectedMedia,
  selectedNote,
  tags,
  trashCount,
  activeMode,
}: SidebarBrowserProps) {
  
  const [searchFilter, setSearchFilter] = useState<"ALL" | "FILES" | "NOTES" | "CHATS">("ALL");

  useEffect(() => {
    setSearchFilter("ALL");
  }, [query]);

  const folderMap = new Map(folders.map((f) => [f.id, f]));
  function getItemMode(folderId: string | null): "FILES" | "NOTES" | "KEEP" | "CHAT" {
    if (!folderId) return "FILES";
    let current = folderMap.get(folderId);
    while (current) {
      if (current.type === "NOTES_ROOT") return "NOTES";
      if (current.type === "KEEP_ROOT") return "KEEP";
      if (current.type === "CHAT_ROOT") return "CHAT";
      current = current.parentId ? folderMap.get(current.parentId) : undefined;
    }
    return "FILES";
  }

  // 1. Files mode data
  const filesFolders = folders;
  const filesNotes = notes;
  const filesMedia = mediaAssets;

  // 2. Notes mode data
  const notesRootId = folders.find((f) => f.type === "NOTES_ROOT")?.id ?? null;
  const notesFolders = folders.filter((f) => getItemMode(f.id) === "NOTES" && f.id !== notesRootId);
  const notesNotes = notes.filter((n) => getItemMode(n.folderId) === "NOTES");

  // 3. Chat mode data
  const chatRootId = folders.find((f) => f.type === "CHAT_ROOT")?.id ?? null;
  const chatFolders = folders.filter((f) => f.parentId === chatRootId);

  // 4. Filter search results
  const filteredMatchingFolders = matchingFolders.filter((f) => {
    const mode = getItemMode(f.id);
    if (searchFilter === "FILES") return mode === "FILES";
    if (searchFilter === "NOTES") return mode === "NOTES" || mode === "KEEP";
    if (searchFilter === "CHATS") return mode === "CHAT";
    return true;
  });

  const filteredNotes = notes.filter((n) => {
    const mode = getItemMode(n.folderId);
    if (searchFilter === "FILES") return mode === "FILES";
    if (searchFilter === "NOTES") return mode === "NOTES" || mode === "KEEP";
    if (searchFilter === "CHATS") return mode === "CHAT";
    return true;
  });

  const filteredMediaAssets = mediaAssets.filter((m) => {
    const mode = getItemMode(m.folderId);
    if (searchFilter === "FILES") return mode === "FILES";
    if (searchFilter === "NOTES") return mode === "NOTES" || mode === "KEEP";
    if (searchFilter === "CHATS") return mode === "CHAT";
    return true;
  });

  const getContentHref = ({
    folderId,
    mediaId,
    noteId,
    query: q,
    tagSlug,
  }: {
    folderId?: string | null;
    mediaId?: string;
    noteId?: string;
    query?: string;
    tagSlug?: string;
  }) => {
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

    if (q) {
      hrefParams.set("q", q);
    }

    if (tagSlug && !mediaId) {
      hrefParams.set("tag", tagSlug);
    }

    return `/${hrefParams.toString() ? `?${hrefParams.toString()}` : ""}`;
  };

  return (
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

        {/* Toolbar: files, notes, and chat modes */}
        {(activeMode === "FILES" || activeMode === "NOTES" || (activeMode === "CHAT" && (!selectedFolder || selectedFolder.id === chatRootId))) && (
          <BrowserToolbar
            folderId={activeMode === "CHAT" ? chatRootId : (selectedFolder?.id ?? null)}
            disabled={isTrashView}
            activeMode={activeMode}
          />
        )}

        {/* Badge Tags list: only for files and notes modes */}
        {(activeMode === "FILES" || activeMode === "NOTES") && (
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
        )}

        {activeTag ? (
          <div className="flex flex-col gap-2 rounded-md border border-slate-700 bg-[#111318] p-2">
            <ClientForm action={renameTagAction} className="flex gap-2">
              <input type="hidden" name="tagId" value={activeTag.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Input aria-label="Rename tag" defaultValue={activeTag.name} name="name" required />
              <Button size="sm" type="submit" variant="outline">
                Rename
              </Button>
            </ClientForm>
            <ClientForm action={deleteTagAction}>
              <input type="hidden" name="tagId" value={activeTag.id} />
              <Button className="w-full" size="sm" type="submit" variant="outline">
                Delete tag
              </Button>
            </ClientForm>
          </div>
        ) : null}

        {/* Search chips overlay in sidebar browser */}
        {query && (
          <div className="flex flex-wrap gap-1.5 border-t border-slate-800/60 pt-3">
            {(["ALL", "FILES", "NOTES", "CHATS"] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={searchFilter === filter ? "default" : "outline"}
                className={cn(
                  "h-7 px-2.5 text-xs rounded-full",
                  searchFilter === filter
                    ? "bg-purple-600 hover:bg-purple-700 text-white font-medium"
                    : "text-slate-400 border-slate-800 bg-transparent hover:bg-slate-800 hover:text-slate-200"
                )}
                onClick={() => setSearchFilter(filter)}
              >
                {filter === "ALL" ? "All" : filter === "FILES" ? "Files" : filter === "NOTES" ? "Notes" : "Chats"}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!isTrashView ? (
          isFilteredView ? (
            <nav className="space-y-1" aria-label={browserTitle}>
              <p className="px-3 py-1 text-xs font-semibold uppercase text-slate-500">
                {browserTitle}
              </p>
              {filteredMatchingFolders
                .slice()
                .sort((a, b) => compareAlphanumeric(a.name, b.name))
                .map((folder) => (
                  <Link
                    key={`folder-result:${folder.id}`}
                    className="flex h-9 min-w-0 items-center gap-2 rounded-md px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-50"
                    href={`/?folder=${folder.id}`}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                    <span className="text-xs text-slate-500">
                      {folder._count ? (folder._count.children ?? 0) + (folder._count.notes ?? 0) + (folder._count.mediaAssets ?? 0) : 0}
                    </span>
                  </Link>
                ))}
              {filteredNotes
                .slice()
                .sort((a, b) => compareAlphanumeric(a.title, b.title))
                .map((note) => (
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
              {filteredMediaAssets
                .slice()
                .sort((a, b) => compareAlphanumeric(a.filename, b.filename))
                .map((mediaAsset) => (
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
              {filteredMatchingFolders.length === 0 && filteredNotes.length === 0 && filteredMediaAssets.length === 0 ? (
                <div className="px-3 py-5 text-sm text-slate-500">No matching vault content</div>
              ) : null}
            </nav>
          ) : activeMode === "KEEP" ? (
            /* Render Keep tags list vertical menu */
            <nav className="space-y-1.5" aria-label="Keep tags">
              <div className="mb-2 px-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tags</span>
              </div>
              {tags.length > 0 ? (
                tags.map((tag) => {
                  const isActive = activeTagSlug === tag.slug;
                  const tagParams = new URLSearchParams();
                  if (query) {
                    tagParams.set("q", query);
                  }
                  if (!isActive) {
                    tagParams.set("tag", tag.slug);
                  }
                  const keepRootId = folders.find((f) => f.type === "KEEP_ROOT")?.id;
                  if (keepRootId) {
                    tagParams.set("folder", keepRootId);
                  }
                  return (
                    <Link
                      key={tag.id}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-md px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-50",
                        isActive && "bg-purple-600/15 text-purple-200 hover:bg-purple-600/20"
                      )}
                      href={`/?${tagParams.toString()}`}
                    >
                      <Tags className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                      <span className="text-xs text-slate-500">{tag._count.notes}</span>
                    </Link>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-xs text-slate-500 text-center">
                  No tags yet
                </div>
              )}
            </nav>
          ) : activeMode === "NOTES" ? (
            <BrowserTree
              mode="NOTES"
              folders={notesFolders}
              notes={notesNotes}
              mediaAssets={[]}
              selectedFolderId={selectedFolder?.id ?? null}
              selectedNoteId={selectedNote?.id ?? null}
              selectedMediaId={selectedMedia?.id ?? null}
              folderDestinations={folderDestinations}
              isVaultRootActive={isVaultRootActive}
              rootFolderId={notesRootId}
            />
          ) : activeMode === "CHAT" ? (
            <BrowserTree
              mode="CHAT"
              folders={chatFolders}
              notes={[]}
              mediaAssets={[]}
              selectedFolderId={selectedFolder?.id ?? null}
              selectedNoteId={selectedNote?.id ?? null}
              selectedMediaId={selectedMedia?.id ?? null}
              folderDestinations={folderDestinations}
              isVaultRootActive={isVaultRootActive}
              rootFolderId={chatRootId}
            />
          ) : (
            <BrowserTree
              mode="FILES"
              folders={filesFolders}
              notes={filesNotes}
              mediaAssets={filesMedia}
              selectedFolderId={selectedFolder?.id ?? null}
              selectedNoteId={selectedNote?.id ?? null}
              selectedMediaId={selectedMedia?.id ?? null}
              folderDestinations={folderDestinations}
              isVaultRootActive={isVaultRootActive}
            />
          )
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href="/"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  title="Back to Vault"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">Trash</span>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {trashCount}
                </Badge>
              </div>
              {trashCount > 0 ? (
                <ConfirmForm
                  action={emptyTrashAction}
                  message="Are you sure you want to empty the trash? All items will be permanently deleted. This action cannot be undone."
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    type="submit"
                    className="h-7 px-2 text-xs text-rose-400 hover:bg-rose-950/20 hover:text-rose-300"
                    title="Empty Trash"
                  >
                    <Trash className="mr-1 h-3.5 w-3.5" />
                    Empty
                  </Button>
                </ConfirmForm>
              ) : null}
            </div>

            <nav className="space-y-1.5" aria-label="Trashed items">
              {deletedFolders
                .slice()
                .sort((a, b) => compareAlphanumeric(a.name, b.name))
                .map((folder) => {
                  const isSelected = selectedDeletedFolder?.id === folder.id;
                  return (
                    <div
                      key={`deleted-folder:${folder.id}`}
                      className="group flex h-9 items-center justify-between rounded-md px-2 transition-colors hover:bg-slate-800/60"
                    >
                      <Link
                        href={`/?view=trash&folder=${folder.id}`}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-300 hover:text-slate-50",
                          isSelected && "text-purple-200"
                        )}
                      >
                        <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate" title={folder.name}>{folder.name}</span>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                        <ClientForm action={restoreFolderAction}>
                          <input type="hidden" name="folderId" value={folder.id} />
                          <Button
                            size="icon"
                            variant="ghost"
                            type="submit"
                            className="h-7 w-7 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                            title="Restore folder"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </ClientForm>
                        <ConfirmForm
                          action={deleteFolderAction}
                          message={`Are you sure you want to permanently delete the folder '${folder.name}' and all of its contents? This action cannot be undone.`}
                        >
                          <input type="hidden" name="folderId" value={folder.id} />
                          <Button
                            size="icon"
                            variant="ghost"
                            type="submit"
                            className="h-7 w-7 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300"
                            title="Permanently delete folder"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </ConfirmForm>
                      </div>
                    </div>
                  );
                })}

              {deletedNotes
                .slice()
                .sort((a, b) => compareAlphanumeric(a.title, b.title))
                .map((note) => {
                  const isSelected = selectedDeletedNote?.id === note.id;
                  return (
                    <div
                      key={`deleted-note:${note.id}`}
                      className="group flex h-9 items-center justify-between rounded-md px-2 transition-colors hover:bg-slate-800/60"
                    >
                      <Link
                        href={`/?view=trash&note=${note.id}`}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-300 hover:text-slate-50",
                          isSelected && "text-purple-200"
                        )}
                      >
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate" title={note.title}>{note.title}</span>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                        <ClientForm action={restoreNoteAction}>
                          <input type="hidden" name="noteId" value={note.id} />
                          <Button
                            size="icon"
                            variant="ghost"
                            type="submit"
                            className="h-7 w-7 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                            title="Restore note"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </ClientForm>
                        <ConfirmForm
                          action={deleteNoteAction}
                          message={`Are you sure you want to permanently delete the note '${note.title}'? This action cannot be undone.`}
                        >
                          <input type="hidden" name="noteId" value={note.id} />
                          <Button
                            size="icon"
                            variant="ghost"
                            type="submit"
                            className="h-7 w-7 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300"
                            title="Permanently delete note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </ConfirmForm>
                      </div>
                    </div>
                  );
                })}

              {deletedMediaAssets
                .slice()
                .sort((a, b) => compareAlphanumeric(a.filename, b.filename))
                .map((media) => {
                  const isSelected = selectedDeletedMedia?.id === media.id;
                  return (
                    <div
                      key={`deleted-media:${media.id}`}
                      className="group flex h-9 items-center justify-between rounded-md px-2 transition-colors hover:bg-slate-800/60"
                    >
                      <Link
                        href={`/?view=trash&media=${media.id}`}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-300 hover:text-slate-50",
                          isSelected && "text-purple-200"
                        )}
                      >
                        <ImagePlus className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate" title={media.filename}>{media.filename}</span>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                        <ClientForm action={restoreMediaAssetAction}>
                          <input type="hidden" name="mediaAssetId" value={media.id} />
                          <Button
                            size="icon"
                            variant="ghost"
                            type="submit"
                            className="h-7 w-7 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                            title="Restore media asset"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </ClientForm>
                        <ConfirmForm
                          action={deleteMediaAssetAction}
                          message={`Are you sure you want to permanently delete the media asset '${media.filename}'? This action cannot be undone.`}
                        >
                          <input type="hidden" name="mediaAssetId" value={media.id} />
                          <Button
                            size="icon"
                            variant="ghost"
                            type="submit"
                            className="h-7 w-7 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300"
                            title="Permanently delete media asset"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </ConfirmForm>
                      </div>
                    </div>
                  );
                })}

              {trashCount === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-slate-500">
                  Trash is empty
                </div>
              ) : null}
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}

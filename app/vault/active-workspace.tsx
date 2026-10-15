"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import {
  Folder,
  Check,
  Move,
  Trash2,
  Download,
} from "lucide-react";
import {
  moveFolderAction,
  renameFolderAction,
  trashFolderAction,
} from "@/app/folders/actions";
import {
  moveNoteAction,
  renameNoteAction,
  trashNoteAction,
} from "@/app/notes/actions";
import {
  moveMediaAssetAction,
  renameMediaAssetAction,
  trashMediaAssetAction,
} from "@/app/media/actions";
import { bulkMoveItemsAction, bulkTrashItemsAction } from "@/app/bulk/actions";
import { compareAlphanumeric } from "@/lib/sorting";
import { getNoteFilename } from "@/lib/namespace/manager";
import { cn } from "@/lib/utils";
import { FolderCard } from "./folder-card";
import { MediaPreview } from "./media-preview";
import { MediaCard } from "./media-card";
import { NoteCard } from "./note-card";
import { NotePreview } from "./note-preview";
import type { FolderEntry, MediaEntry, NoteEntry, TagEntry } from "./vault-entries";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/settings-context";

interface ActiveWorkspaceProps {
  selectedNote: NoteEntry | null;
  selectedMedia: MediaEntry | null;
  selectedFolder: FolderEntry | null;
  folderTrail: FolderEntry[];
  folderDestinations: { id: string; name: string }[];
  imageMediaAssets: { id: string; filename: string; location: string; url: string; folderId: string | null }[];
  tags: TagEntry[];
  textPreviewContent: string;
  hasVaultContent: boolean;
  browserTitle: string;
  allMediaAssets: {
    id: string;
    filename: string;
    contentType: string;
    r2Key: string;
    thumbnailKey?: string | null;
    folderId: string | null;
  }[];
  allFolders?: FolderEntry[];
  allNotes?: NoteEntry[];
}

function getNoteSnippet(body: string, limit = 80): string {
  if (!body) return "";
  // Strip basic markdown symbols for cleaner text snippets
  const plainText = body
    .replace(/[-*#_`>]/g, "")
    .replace(/\[[ xX]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length > limit ? plainText.substring(0, limit) + "..." : plainText;
}

export function ActiveWorkspace({
  selectedNote,
  selectedMedia,
  selectedFolder,
  folderTrail,
  folderDestinations,
  imageMediaAssets,
  tags,
  allMediaAssets,
  allFolders = [],
  allNotes = [],
}: ActiveWorkspaceProps) {

  const { settings } = useSettings();
  const router = useRouter();
  const fileCardAspect = settings.fileCardAspect || "VIDEO";

  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Bulk Selection state (local to this workspace)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Auto-exit selection mode when opening an item, switching modes, or navigating folders
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setMoveOpen(false);
    setBulkError("");
  }, [selectedFolder?.id, selectedMedia?.id, selectedNote?.id]);

  const folderMap = new Map(allFolders.map((f) => [f.id, f]));
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

  function isDescendant(draggedId: string, targetId: string | null): boolean {
    if (!targetId) return false;
    if (draggedId === targetId) return true;
    const targetFolder = allFolders.find((f) => f.id === targetId);
    return targetFolder ? isDescendant(draggedId, targetFolder.parentId) : false;
  }

  async function handleDrop(targetFolderId: string | null, event: React.DragEvent) {
    event.preventDefault();
    setDragOverFolderId(null);

    try {
      const rawData = event.dataTransfer.getData("application/filebucket");
      if (!rawData) return;
      const data = JSON.parse(rawData);

      // Validation
      if (data.id === targetFolderId) return;
      if (data.type === "folder" && isDescendant(data.id, targetFolderId)) {
        alert("Cannot move a folder inside itself or its sub-folders.");
        return;
      }

      // Boundary Validation
      const targetMode = getItemMode(targetFolderId);

      // Get item name and current mode
      let name = "";
      let currentMode: "FILES" | "NOTES" | "KEEP" | "CHAT" = "FILES";

      if (data.type === "folder") {
        const draggedFolder = allFolders.find((f) => f.id === data.id);
        if (draggedFolder) {
          if (draggedFolder.type && draggedFolder.type !== "GENERAL") {
            alert("Reserved system folders cannot be moved.");
            return;
          }
          name = draggedFolder.name;
          currentMode = getItemMode(draggedFolder.parentId);
          if (currentMode !== targetMode) {
            alert("Folders cannot be moved across mode boundaries.");
            return;
          }
        }
      } else if (data.type === "note") {
        const draggedNote = allNotes.find((n) => n.id === data.id);
        if (draggedNote) {
          name = draggedNote.title;
          currentMode = getItemMode(draggedNote.folderId);
          if (targetMode !== "NOTES" && targetMode !== "KEEP") {
            alert("Notes must reside within the Notes or Quick Notes directories.");
            return;
          }
          if (currentMode !== "FILES" && currentMode !== targetMode) {
            alert("Notes cannot be moved across Obsidian and Keep mode boundaries.");
            return;
          }
        }
      } else if (data.type === "media") {
        const draggedMedia = allMediaAssets.find((m) => m.id === data.id);
        if (draggedMedia) {
          name = draggedMedia.filename;
          currentMode = getItemMode(draggedMedia.folderId);
          if (
            currentMode === "KEEP" ||
            currentMode === "CHAT" ||
            targetMode === "KEEP" ||
            targetMode === "CHAT"
          ) {
            alert("Chat attachments and Keep media files are locked within their respective roots.");
            return;
          }
        }
      }

      // Collision Check
      if (name) {
        let isCollision = false;
        if (data.type === "folder") {
          isCollision = allFolders.some(
            (f) => f.parentId === targetFolderId && f.id !== data.id && f.name.toLowerCase() === name.toLowerCase()
          );
        } else {
          const targetFilename = data.type === "note" ? getNoteFilename(name) : name;
          
          const collidesWithNote = allNotes.some((n) => {
            if (data.type === "note" && n.id === data.id) return false;
            return n.folderId === targetFolderId && getNoteFilename(n.title).toLowerCase() === targetFilename.toLowerCase();
          });
          
          const collidesWithMedia = allMediaAssets.some((m) => {
            if (data.type === "media" && m.id === data.id) return false;
            return m.folderId === targetFolderId && m.filename.toLowerCase() === targetFilename.toLowerCase();
          });

          isCollision = collidesWithNote || collidesWithMedia;
        }

        if (isCollision) {
          alert("An item with the same name already exists in the target folder.");
          return;
        }
      }

      // Call actions
      const formData = new FormData();
      if (data.type === "folder") {
        formData.append("folderId", data.id);
        formData.append("parentId", targetFolderId ?? "");
        window.dispatchEvent(new CustomEvent("vault-mutate", {
          detail: { type: "move-folder", folderId: data.id, parentId: targetFolderId }
        }));
        await moveFolderAction(formData);
      } else if (data.type === "note") {
        formData.append("noteId", data.id);
        formData.append("folderId", targetFolderId ?? "");
        window.dispatchEvent(new CustomEvent("vault-mutate", {
          detail: { type: "move-note", noteId: data.id, parentId: targetFolderId }
        }));
        await moveNoteAction(formData);
      } else if (data.type === "media") {
        formData.append("mediaAssetId", data.id);
        formData.append("folderId", targetFolderId ?? "");
        window.dispatchEvent(new CustomEvent("vault-mutate", {
          detail: { type: "move-media", mediaAssetId: data.id, parentId: targetFolderId }
        }));
        await moveMediaAssetAction(formData);
      }
    } catch (err) {
      console.error("Drop operation failed", err);
    }
  }

  if (selectedNote) {
    return (
      <NotePreview
        folderDestinations={folderDestinations}
        folderTrail={folderTrail}
        imageMediaAssets={imageMediaAssets}
        selectedNote={selectedNote}
        tags={tags}
      />
    );
  }

  if (selectedMedia) {
    return (
      <MediaPreview
        allMediaAssets={allMediaAssets}
        folderDestinations={folderDestinations}
        folderTrail={folderTrail}
        selectedMedia={selectedMedia}
      />
    );
  }

  const showSpecialFoldersSetting = (() => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem("filebucket_show_special_folders") === "true";
      }
    } catch {
      // ignore
    }
    return false;
  })();

  const childFolders = allFolders.filter((f) => {
    if (f.parentId !== (selectedFolder?.id ?? null)) return false;
    if (!showSpecialFoldersSetting && f.parentId === null) {
      const isReservedRoot = f.type === "NOTES_ROOT" || f.type === "KEEP_ROOT" || f.type === "CHAT_ROOT";
      if (isReservedRoot) return false;
    }
    return true;
  }).sort((a, b) => compareAlphanumeric(a.name, b.name));

  const childNotes = allNotes.filter(
    (n) => n.folderId === (selectedFolder?.id ?? null)
  ).sort((a, b) => compareAlphanumeric(a.title, b.title));

  const childMedia = allMediaAssets.filter(
    (m) => m.folderId === (selectedFolder?.id ?? null)
  ).sort((a, b) => compareAlphanumeric(a.filename, b.filename));

  // Bulk Selection helpers (Files Mode: folders and media assets only)
  const currentFolderMode = getItemMode(selectedFolder?.id ?? null);
  const childItems: { type: "folder" | "media"; id: string }[] = [
    ...childFolders.map((f) => ({ type: "folder" as const, id: f.id })),
    ...childMedia.map((m) => ({ type: "media" as const, id: m.id })),
  ];
  const selectedItems = childItems.filter((item) => selectedIds.has(item.id));
  const allChildIds = childItems.map((item) => item.id);
  const allSelected = allChildIds.length > 0 && allChildIds.every((id) => selectedIds.has(id));

  function toggleSelection(type: "folder" | "media", id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allChildIds.forEach((id) => next.delete(id));
      } else {
        allChildIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setMoveOpen(false);
    setBulkError("");
  }

  async function handleBulkMove(targetFolderId: string | null) {
    if (selectedItems.length === 0) return;
    const result = await bulkMoveItemsAction(
      selectedItems.map(({ type, id }) => ({ type, id })),
      targetFolderId
    );
    const failedIds = new Set(result.failures.map((f) => f.id));
    for (const item of selectedItems) {
      if (failedIds.has(item.id)) continue;
      window.dispatchEvent(
        new CustomEvent("vault-mutate", {
          detail:
            item.type === "folder"
              ? { type: "move-folder", folderId: item.id, parentId: targetFolderId }
              : { type: "move-media", mediaAssetId: item.id, parentId: targetFolderId },
        })
      );
    }
    if (result.failures.length > 0) {
      setBulkError(result.failures.map((f) => `${f.name || "Item"}: ${f.reason}`).join(" | "));
    } else {
      clearSelection();
    }
    router.refresh();
  }

  async function handleBulkTrash() {
    if (selectedItems.length === 0) return;
    const result = await bulkTrashItemsAction(selectedItems.map(({ type, id }) => ({ type, id })));
    const failedIds = new Set(result.failures.map((f) => f.id));
    for (const item of selectedItems) {
      if (failedIds.has(item.id)) continue;
      window.dispatchEvent(
        new CustomEvent("vault-mutate", {
          detail:
            item.type === "folder"
              ? { type: "trash-folder", folderId: item.id }
              : { type: "trash-media", mediaAssetId: item.id },
        })
      );
    }
    if (result.failures.length > 0) {
      setBulkError(result.failures.map((f) => `${f.name || "Item"}: ${f.reason}`).join(" | "));
    } else {
      clearSelection();
    }
    router.refresh();
  }

  const bulkDownloadHref = `/api/export?ids=${encodeURIComponent(selectedItems.map((item) => `${item.type}:${item.id}`).join(","))}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Folder Contents Header Breadcrumbs */}
      <div className="border-b border-slate-800 bg-[#191c22] px-5 py-2.5 shrink-0 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link
            className={cn(
              "hover:text-slate-100 transition-colors",
              dragOverFolderId === "vault-root" && "text-amber-500 font-semibold"
            )}
            href="/"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverFolderId("vault-root");
            }}
            onDragLeave={() => {
              setDragOverFolderId(null);
            }}
            onDrop={(e) => {
              e.stopPropagation();
              handleDrop(null, e);
            }}
          >
            Vault
          </Link>
          {folderTrail.map((folder) => (
            <span key={folder.id} className="flex items-center gap-2">
              <span className="text-slate-600">/</span>
              <Link
                className={cn(
                  "hover:text-slate-100 transition-colors font-medium",
                  dragOverFolderId === folder.id ? "text-amber-500 font-semibold" : "text-slate-300"
                )}
                href={`/?folder=${folder.id}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFolderId(folder.id);
                }}
                onDragLeave={() => {
                  setDragOverFolderId(null);
                }}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(folder.id, e);
                }}
              >
                {folder.name}
              </Link>
            </span>
          ))}
        </div>

        {currentFolderMode === "FILES" && (
          <div className="flex shrink-0 items-center gap-2">
            {selectionMode ? (
              <>
                <Button
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={toggleSelectAll}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Check className="h-3.5 w-3.5" />
                  {allSelected ? "Deselect all" : "Select all"}
                </Button>
                <Button
                  className="h-8 px-3 text-xs"
                  onClick={clearSelection}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                className="h-8 px-3 text-xs"
                onClick={() => setSelectionMode(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                Select
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Folder Contents */}
      <div
        className={cn(
          "flex-1 overflow-y-auto bg-[#101217] px-6 py-6 transition-colors duration-200",
          dragOverFolderId === "workspace-bg" && "bg-slate-900/60"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (
            dragOverFolderId !== "workspace-bg" &&
            !childFolders.some((f) => f.id === dragOverFolderId) &&
            !folderTrail.some((f) => f.id === dragOverFolderId) &&
            dragOverFolderId !== "vault-root"
          ) {
            setDragOverFolderId("workspace-bg");
          }
        }}
        onDragLeave={() => {
          setDragOverFolderId((prev) => (prev === "workspace-bg" ? null : prev));
        }}
        onDrop={(e) => {
          handleDrop(selectedFolder?.id ?? null, e);
        }}
      >
        {childFolders.length > 0 || childNotes.length > 0 || childMedia.length > 0 ? (
          <div className="space-y-6">
            {/* Top Section: Subfolders */}
            {childFolders.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                  Folders ({childFolders.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {childFolders.map((folder) => {
                    const folderChildFolders = allFolders.filter((f) => f.parentId === folder.id).length;
                    const folderChildNotes = allNotes.filter((n) => n.folderId === folder.id).length;
                    const folderChildMedia = allMediaAssets.filter((m) => m.folderId === folder.id).length;
                    const totalItems = folderChildFolders + folderChildNotes + folderChildMedia;

                    return (
                      <FolderCard
                        key={folder.id}
                        actions={{
                          onMove: async (parentId) => {
                            const formData = new FormData();
                            formData.append("folderId", folder.id);
                            formData.append("parentId", parentId ?? "");
                            window.dispatchEvent(new CustomEvent("vault-mutate", {
                              detail: { type: "move-folder", folderId: folder.id, parentId }
                            }));
                            await moveFolderAction(formData);
                          },
                          onRename: async (name) => {
                            const formData = new FormData();
                            formData.append("folderId", folder.id);
                            formData.append("name", name);
                            window.dispatchEvent(new CustomEvent("vault-mutate", {
                              detail: { type: "rename-folder", folderId: folder.id, name }
                            }));
                            await renameFolderAction(formData);
                          },
                          onTrash: async () => {
                            const formData = new FormData();
                            formData.append("folderId", folder.id);
                            window.dispatchEvent(new CustomEvent("vault-mutate", {
                              detail: { type: "trash-folder", folderId: folder.id }
                            }));
                            await trashFolderAction(formData);
                          },
                        }}
                        destinations={folderDestinations}
                        drag={{
                          draggable: true,
                          onDragStart: (e) => {
                            e.dataTransfer.setData("application/filebucket", JSON.stringify({ type: "folder", id: folder.id }));
                            e.dataTransfer.effectAllowed = "move";
                          },
                          onDragOver: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverFolderId(folder.id);
                          },
                          onDragLeave: () => {
                            setDragOverFolderId(null);
                          },
                          onDrop: (e) => {
                            e.stopPropagation();
                            handleDrop(folder.id, e);
                          },
                        }}
                        folder={folder}
                        isDragOver={dragOverFolderId === folder.id}
                        itemCount={totalItems}
                        onToggleSelect={() => toggleSelection("folder", folder.id)}
                        selected={selectedIds.has(folder.id)}
                        selectionMode={selectionMode}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Section: Files & Media */}
            {(childNotes.length > 0 || childMedia.length > 0) && (
              <div>
                {childFolders.length > 0 && (
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                    Files & Media ({childNotes.length + childMedia.length})
                  </h3>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {/* Notes */}
                  {childNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      actions={{
                        onMove: async (folderId) => {
                          const formData = new FormData();
                          formData.append("noteId", note.id);
                          formData.append("folderId", folderId ?? "");
                          window.dispatchEvent(new CustomEvent("vault-mutate", {
                            detail: { type: "move-note", noteId: note.id, parentId: folderId }
                          }));
                          await moveNoteAction(formData);
                        },
                        onRename: async (name) => {
                          const formData = new FormData();
                          formData.append("noteId", note.id);
                          formData.append("name", name);
                          window.dispatchEvent(new CustomEvent("vault-mutate", {
                            detail: { type: "rename-note", noteId: note.id, name }
                          }));
                          await renameNoteAction(formData);
                        },
                        onTrash: async () => {
                          const formData = new FormData();
                          formData.append("noteId", note.id);
                          formData.append("folderId", note.folderId ?? "");
                          window.dispatchEvent(new CustomEvent("vault-mutate", {
                            detail: { type: "trash-note", noteId: note.id }
                          }));
                          await trashNoteAction(formData);
                        },
                      }}
                      aspect={fileCardAspect}
                      destinations={folderDestinations}
                      drag={{
                        draggable: true,
                        onDragStart: (e) => {
                          e.dataTransfer.setData("application/filebucket", JSON.stringify({ type: "note", id: note.id }));
                          e.dataTransfer.effectAllowed = "move";
                        },
                      }}
                      note={note}
                    />
                  ))}

                  {/* Media Files */}
                  {childMedia.map((media) => (
                    <MediaCard
                      key={media.id}
                      actions={{
                        onMove: async (folderId) => {
                          const formData = new FormData();
                          formData.append("mediaAssetId", media.id);
                          formData.append("folderId", folderId ?? "");
                          window.dispatchEvent(new CustomEvent("vault-mutate", {
                            detail: { type: "move-media", mediaAssetId: media.id, parentId: folderId }
                          }));
                          await moveMediaAssetAction(formData);
                        },
                        onRename: async (name) => {
                          const formData = new FormData();
                          formData.append("mediaAssetId", media.id);
                          formData.append("name", name);
                          window.dispatchEvent(new CustomEvent("vault-mutate", {
                            detail: { type: "rename-media", mediaAssetId: media.id, name }
                          }));
                          await renameMediaAssetAction(formData);
                        },
                        onTrash: async () => {
                          const formData = new FormData();
                          formData.append("mediaAssetId", media.id);
                          formData.append("folderId", media.folderId ?? "");
                          window.dispatchEvent(new CustomEvent("vault-mutate", {
                            detail: { type: "trash-media", mediaAssetId: media.id }
                          }));
                          await trashMediaAssetAction(formData);
                        },
                      }}
                      aspect={fileCardAspect}
                      destinations={folderDestinations}
                      drag={{
                        draggable: true,
                        onDragStart: (e) => {
                          e.dataTransfer.setData("application/filebucket", JSON.stringify({ type: "media", id: media.id }));
                          e.dataTransfer.effectAllowed = "move";
                        },
                      }}
                      media={media}
                      onToggleSelect={() => toggleSelection("media", media.id)}
                      selected={selectedIds.has(media.id)}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#14161d] border border-slate-800 text-slate-500 mb-4 shadow-inner">
              <Folder className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">This folder is empty</h3>
            <p className="text-xs text-slate-500 mt-1">Upload files or create subfolders to get started.</p>
          </div>
        )}
      </div>

      {/* Docked Bulk Actions Bar */}
      {selectionMode && selectedItems.length > 0 && (
        <div className="shrink-0 border-t border-slate-800 bg-[#191c22] px-5 py-3">
          {bulkError ? (
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 flex-1 truncate text-xs text-rose-400">{bulkError}</p>
              <Button
                className="h-8 px-3 text-xs"
                onClick={() => setBulkError("")}
                size="sm"
                type="button"
                variant="ghost"
              >
                Dismiss
              </Button>
            </div>
          ) : moveOpen ? (
            <form
              name="bulk-move"
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const targetFolderId = String(formData.get("targetFolderId") ?? "").trim() || null;
                handleBulkMove(targetFolderId);
              }}
            >
              <select
                autoFocus
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                defaultValue=""
                name="targetFolderId"
              >
                <option value="">Vault</option>
                {folderDestinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </select>
              <Button className="h-8 px-3 text-xs" size="sm" type="submit">
                Move
              </Button>
              <Button
                className="h-8 px-3 text-xs"
                onClick={() => setMoveOpen(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-100">{selectedItems.length}</span> selected
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={() => setMoveOpen(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Move className="h-3.5 w-3.5" />
                  Move
                </Button>
                <Button
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={handleBulkTrash}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Move to Trash
                </Button>
                <Button asChild className="h-8 gap-1.5 px-3 text-xs" size="sm" variant="default">
                  <a href={bulkDownloadHref}>
                    <Download className="h-3.5 w-3.5" />
                    Download ZIP
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

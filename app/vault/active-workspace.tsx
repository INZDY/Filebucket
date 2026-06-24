"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileQuestion,
  FileText,
  ImagePlus,
  Music,
  Video,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Loader2,
  Folder,
} from "lucide-react";
import { NoteActionsMenu } from "@/app/notes/note-actions-menu";
import { moveFolderAction } from "@/app/folders/actions";
import { moveNoteAction } from "@/app/notes/actions";
import { moveMediaAssetAction } from "@/app/media/actions";
import { NoteEditor } from "@/app/notes/note-editor";
import { MediaActionsMenu } from "@/app/media/media-actions-menu";
import { compareAlphanumeric } from "@/lib/sorting";
import { getMediaAssetUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MangaReader, type ReaderPage } from "@/components/manga-reader";

type FolderEntry = {
  id: string;
  name: string;
  parentId: string | null;
  type?: string;
};

type NoteEntry = {
  id: string;
  title: string;
  body: string;
  updatedAt: Date;
  folderId: string | null;
  tags: {
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
  folder?: {
    id: string;
    name: string;
  } | null;
};

type MediaEntry = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string;
  folder?: {
    id: string;
    name: string;
  } | null;
};

type TagEntry = {
  id: string;
  name: string;
  slug: string;
};

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
    folderId: string | null;
  }[];
  allFolders?: FolderEntry[];
  allNotes?: NoteEntry[];
}

function getMediaPreviewKind(contentType: string, filename = "") {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("text/") || contentType === "application/json") return "text";
  if (
    contentType === "application/zip" ||
    contentType === "application/x-zip-compressed" ||
    filename.endsWith(".zip") ||
    filename.endsWith(".cbz")
  ) {
    return "archive";
  }
  return "unsupported";
}

export function ActiveWorkspace({
  selectedNote,
  selectedMedia,
  selectedFolder,
  folderTrail,
  folderDestinations,
  imageMediaAssets,
  tags,
  textPreviewContent,
  allMediaAssets,
  allFolders = [],
  allNotes = [],
}: ActiveWorkspaceProps) {
  const router = useRouter();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Manga Reader states
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [archivePages, setArchivePages] = useState<ReaderPage[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

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

  function getNoteFilename(title: string): string {
    const trimmedTitle = title.trim() || "Untitled note";
    return trimmedTitle.toLowerCase().endsWith(".md") ? trimmedTitle : `${trimmedTitle}.md`;
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
        await moveFolderAction(formData);
      } else if (data.type === "note") {
        formData.append("noteId", data.id);
        formData.append("folderId", targetFolderId ?? "");
        await moveNoteAction(formData);
      } else if (data.type === "media") {
        formData.append("mediaAssetId", data.id);
        formData.append("folderId", targetFolderId ?? "");
        await moveMediaAssetAction(formData);
      }

      router.refresh();
    } catch (err) {
      console.error("Drop operation failed", err);
    }
  }

  // 1. Identify the preview kind of the active media asset
  const activeMediaKind = selectedMedia ? getMediaPreviewKind(selectedMedia.contentType, selectedMedia.filename) : null;

  // 2. Filter the media assets to those in the same folder and with the same preview kind
  const siblingMedia = selectedMedia && activeMediaKind !== "unsupported"
    ? allMediaAssets
        .filter(
          (m) =>
            m.folderId === (selectedMedia.folder?.id ?? null) &&
            getMediaPreviewKind(m.contentType, m.filename) === activeMediaKind
        )
        .slice()
        .sort((a, b) => compareAlphanumeric(a.filename, b.filename))
    : [];

  const handleOpenArchiveReader = async () => {
    if (!selectedMedia) return;
    const previewUrl = getMediaAssetUrl(selectedMedia.r2Key);
    if (!previewUrl) return;

    setIsArchiveLoading(true);
    setArchiveError("");

    try {
      const { parseMangaArchive } = await import("@/lib/manga");
      const res = await fetch(previewUrl);
      if (!res.ok) {
        throw new Error(`Failed to download archive: ${res.statusText}`);
      }
      const buffer = await res.arrayBuffer();
      const parsedPages = await parseMangaArchive(buffer);
      if (parsedPages.length === 0) {
        throw new Error("No readable image pages found in the archive.");
      }
      setArchivePages(parsedPages);
      setIsReaderOpen(true);
    } catch (err) {
      console.error(err);
      setArchiveError(err instanceof Error ? err.message : "Failed to load archive.");
    } finally {
      setIsArchiveLoading(false);
    }
  };

  // 3. Find the current, next, and previous items
  const currentIndex = selectedMedia ? siblingMedia.findIndex((m) => m.id === selectedMedia.id) : -1;
  const prevMedia = currentIndex > 0 ? siblingMedia[currentIndex - 1] : null;
  const nextMedia = currentIndex >= 0 && currentIndex < siblingMedia.length - 1 ? siblingMedia[currentIndex + 1] : null;

  const getNavigationHref = (media: typeof siblingMedia[number]) => {
    const params = new URLSearchParams();
    if (media.folderId) {
      params.set("folder", media.folderId);
    }
    params.set("media", media.id);
    return `/?${params.toString()}`;
  };

  const prevHref = prevMedia ? getNavigationHref(prevMedia) : null;
  const nextHref = nextMedia ? getNavigationHref(nextMedia) : null;

  // Keyboard navigation
  useEffect(() => {
    if (!selectedMedia || isReaderOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && prevHref) {
        router.push(prevHref);
      } else if (e.key === "ArrowRight" && nextHref) {
        router.push(nextHref);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMedia, prevHref, nextHref, router, isReaderOpen]);

  // Touch navigation handlers
  const minSwipeDistance = 50;

  function handleTouchStart(e: React.TouchEvent) {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function handleTouchEnd() {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && nextHref) {
      router.push(nextHref);
    } else if (isRightSwipe && prevHref) {
      router.push(prevHref);
    }
  }
  
  if (selectedNote) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-slate-800 bg-[#191c22] px-5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
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
                <span className="max-w-56 truncate font-medium text-slate-200">{selectedNote.title}</span>
              </div>
            </div>

            <NoteActionsMenu note={selectedNote} destinations={folderDestinations} />
          </div>
        </div>
        <NoteEditor
          key={selectedNote.id}
          imageMediaAssets={imageMediaAssets}
          note={{
            id: selectedNote.id,
            title: selectedNote.title,
            body: selectedNote.body,
          }}
          updatedAt={selectedNote.updatedAt}
          allTags={tags}
          assignedTags={selectedNote.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name, slug: nt.tag.slug }))}
        />
      </div>
    );
  }

  if (selectedMedia) {
    const previewUrl = getMediaAssetUrl(selectedMedia.r2Key);
    const previewKind = getMediaPreviewKind(selectedMedia.contentType, selectedMedia.filename);

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-slate-800 bg-[#191c22] px-5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
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
                <span className="max-w-56 truncate font-medium text-slate-200">{selectedMedia.filename}</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-500">
                  {selectedMedia.contentType} · {Math.max(1, Math.round(selectedMedia.sizeBytes / 1024))} KB
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {previewKind === "image" && (
                <Button
                  className="h-8 gap-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md shadow-purple-600/10 active:scale-95 transition-transform"
                  onClick={() => setIsReaderOpen(true)}
                  type="button"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Manga Mode
                </Button>
              )}
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
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto bg-[#101217] px-6 py-6 relative group/media-nav"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex min-h-full items-center justify-center relative">
            {/* Previous Media Chevron */}
            {prevHref && (
              <Link
                href={prevHref}
                className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-[#171a20]/70 text-slate-400 hover:bg-[#1f242c]/90 hover:text-slate-100 opacity-0 group-hover/media-nav:opacity-100 transition-opacity duration-200 shadow-lg"
                title="Previous media"
              >
                <ChevronLeft className="h-6 w-6" />
              </Link>
            )}

            {(() => {
              if (previewKind === "image" && previewUrl) {
                // eslint-disable-next-line @next/next/no-img-element
                return <img
                  alt={selectedMedia.filename}
                  className="max-h-[calc(100vh-220px)] max-w-full object-contain"
                  src={previewUrl}
                />;
              }

              if (previewKind === "audio" && previewUrl) {
                return (
                  <div className="w-full max-w-2xl rounded-md border border-slate-800 bg-[#191c22] p-5 z-0">
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
                    className="w-full h-full min-h-[calc(100vh-240px)] border-0 rounded-md bg-white shadow-md z-0"
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

              if (previewKind === "archive") {
                return (
                  <div className="w-full max-w-md rounded-md border border-slate-800 bg-[#191c22] p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-purple-950/40 text-purple-400">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-100">{selectedMedia.filename}</p>
                    <p className="mt-1 text-[10px] font-mono text-slate-400 mb-6">
                      {Math.max(1, Math.round(selectedMedia.sizeBytes / 1024 / 1024))} MB · Manga Archive
                    </p>
                    {archiveError && (
                      <p className="text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-md mb-4 text-left">
                        {archiveError}
                      </p>
                    )}
                    <Button
                      className="w-full h-10 bg-purple-600 hover:bg-purple-500 text-white active:scale-95 transition-transform text-xs font-semibold gap-1.5"
                      onClick={handleOpenArchiveReader}
                      disabled={isArchiveLoading}
                      type="button"
                    >
                      {isArchiveLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Decompressing Archive...
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-3.5 w-3.5" />
                          Read Archive
                        </>
                      )}
                    </Button>
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

            {/* Next Media Chevron */}
            {nextHref && (
              <Link
                href={nextHref}
                className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-[#171a20]/70 text-slate-400 hover:bg-[#1f242c]/90 hover:text-slate-100 opacity-0 group-hover/media-nav:opacity-100 transition-opacity duration-200 shadow-lg"
                title="Next media"
              >
                <ChevronRight className="h-6 w-6" />
              </Link>
            )}
          </div>
        </div>

        {/* Fullscreen Manga Reader Overlay */}
        {isReaderOpen && (
          <MangaReader
            isOpen={isReaderOpen}
            onClose={() => {
              setIsReaderOpen(false);
              setArchivePages([]);
            }}
            title={archivePages.length > 0 ? selectedMedia.filename : selectedMedia.folder?.name || "Vault"}
            pages={
              archivePages.length > 0
                ? archivePages
                : siblingMedia.map((m) => ({
                    name: m.filename,
                    url: getMediaAssetUrl(m.r2Key) || "",
                  }))
            }
            initialPageIndex={
              archivePages.length > 0
                ? 0
                : siblingMedia.findIndex((m) => m.id === selectedMedia.id)
            }
          />
        )}
      </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Subfolders */}
            {childFolders.map((folder) => (
              <Link
                key={folder.id}
                href={`/?folder=${folder.id}`}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/filebucket", JSON.stringify({ type: "folder", id: folder.id }));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(folder.id);
                }}
                onDragLeave={() => {
                  setDragOverFolderId(null);
                }}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(folder.id, e);
                }}
                className={cn(
                  "group flex flex-col justify-between p-4 rounded-xl border bg-[#14161d]/50 hover:bg-[#1a1d26]/80 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all active:scale-95 duration-200",
                  dragOverFolderId === folder.id ? "border-amber-500 scale-95" : "border-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:bg-amber-500/20 transition-all duration-200">
                    <Folder className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                      {folder.name}
                    </p>
                    <p className="text-xs text-slate-500">Folder</p>
                  </div>
                </div>
              </Link>
            ))}

            {/* Notes */}
            {childNotes.map((note) => (
              <Link
                key={note.id}
                href={note.folderId ? `/?folder=${note.folderId}&note=${note.id}` : `/?note=${note.id}`}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/filebucket", JSON.stringify({ type: "note", id: note.id }));
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-[#14161d]/50 hover:bg-[#1a1d26]/80 hover:border-purple-500/40 hover:shadow-[0_0_15px_rgba(139,92,246,0.05)] transition-all active:scale-95 duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 transition-all duration-200">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                      {note.title}
                    </p>
                    <p className="text-xs text-slate-500">Note</p>
                  </div>
                </div>
              </Link>
            ))}

            {/* Media Files */}
            {childMedia.map((media) => {
              const previewKind = getMediaPreviewKind(media.contentType, media.filename);
              const isImg = previewKind === "image";
              const isAudio = previewKind === "audio";
              const isVideo = previewKind === "video";
              const isPdf = previewKind === "pdf";

              const Icon = isImg
                ? ImagePlus
                : isAudio
                ? Music
                : isVideo
                ? Video
                : isPdf
                ? FileText
                : FileQuestion;

              const colorClass = isImg
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:bg-blue-500/20"
                : isAudio
                ? "bg-green-500/10 text-green-400 border-green-500/20 group-hover:bg-green-500/20"
                : isVideo
                ? "bg-orange-500/10 text-orange-400 border-orange-500/20 group-hover:bg-orange-500/20"
                : isPdf
                ? "bg-red-500/10 text-red-400 border-red-500/20 group-hover:bg-red-500/20"
                : "bg-slate-500/10 text-slate-400 border-slate-500/20 group-hover:bg-slate-500/20";

              const borderHoverClass = isImg
                ? "hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)]"
                : isAudio
                ? "hover:border-green-500/40 hover:shadow-[0_0_15px_rgba(34,197,94,0.05)]"
                : isVideo
                ? "hover:border-orange-500/40 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)]"
                : isPdf
                ? "hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                : "hover:border-slate-500/40";

              return (
                <Link
                  key={media.id}
                  href={media.folderId ? `/?folder=${media.folderId}&media=${media.id}` : `/?media=${media.id}`}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/filebucket", JSON.stringify({ type: "media", id: media.id }));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className={cn(
                    "group flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-[#14161d]/50 hover:bg-[#1a1d26]/80 transition-all active:scale-95 duration-200",
                    borderHoverClass
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200", colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                        {media.filename}
                      </p>
                      <p className="text-xs text-slate-500">File</p>
                    </div>
                  </div>
                </Link>
              );
            })}
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
    </div>
  );
}

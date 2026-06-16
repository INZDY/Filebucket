"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  FileQuestion,
  FileText,
  ImagePlus,
  Music,
  Video,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NoteActionsMenu } from "@/app/notes/note-actions-menu";
import { NoteEditor } from "@/app/notes/note-editor";
import { MediaActionsMenu } from "@/app/media/media-actions-menu";
import { compareAlphanumeric } from "@/lib/sorting";
import { getMediaAssetUrl } from "@/lib/utils";

type FolderEntry = {
  id: string;
  name: string;
  parentId: string | null;
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
  imageMediaAssets: { id: string; filename: string; location: string; url: string }[];
  tags: TagEntry[];
  textPreviewContent: string;
  hasVaultContent: boolean;
  browserTitle: string;
  allMediaAssets: {
    id: string;
    filename: string;
    contentType: string;
    folderId: string | null;
  }[];
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
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

export function ActiveWorkspace({
  selectedNote,
  selectedMedia,
  selectedFolder,
  folderTrail,
  folderDestinations,
  imageMediaAssets,
  tags,
  textPreviewContent,
  hasVaultContent,
  browserTitle,
  allMediaAssets,
}: ActiveWorkspaceProps) {
  const router = useRouter();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 1. Identify the preview kind of the active media asset
  const activeMediaKind = selectedMedia ? getMediaPreviewKind(selectedMedia.contentType) : null;

  // 2. Filter the media assets to those in the same folder and with the same preview kind
  const siblingMedia = selectedMedia && activeMediaKind !== "unsupported"
    ? allMediaAssets
        .filter(
          (m) =>
            m.folderId === (selectedMedia.folder?.id ?? null) &&
            getMediaPreviewKind(m.contentType) === activeMediaKind
        )
        .slice()
        .sort((a, b) => compareAlphanumeric(a.filename, b.filename))
    : [];

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
    if (!selectedMedia) return;

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
  }, [selectedMedia, prevHref, nextHref, router]);

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
          allTags={tags}
          assignedTags={selectedNote.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name, slug: nt.tag.slug }))}
        />
      </div>
    );
  }

  if (selectedMedia) {
    const previewUrl = getMediaAssetUrl(selectedMedia.r2Key);
    const previewKind = getMediaPreviewKind(selectedMedia.contentType);

    return (
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
      </div>
    );
  }

  return (
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
  );
}

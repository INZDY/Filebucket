"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  ImagePlus,
  Loader2,
  Music,
  Video,
} from "lucide-react";
import { BookReader } from "@/components/book-reader";
import { FilebucketPlayer } from "@/components/filebucket-player";
import { MangaReader, type ReaderPage } from "@/components/manga-reader";
import { MediaActionsMenu } from "@/app/media/media-actions-menu";
import { Button } from "@/components/ui/button";
import { compareAlphanumeric } from "@/lib/sorting";
import { getMediaAssetUrl, formatBytes } from "@/lib/utils";
import { getMediaPreviewKind } from "./media-kind";
import type { FolderEntry, MediaEntry, MediaGridEntry } from "./vault-entries";

interface MediaPreviewProps {
  selectedMedia: MediaEntry;
  folderTrail: FolderEntry[];
  folderDestinations: { id: string; name: string }[];
  allMediaAssets: MediaGridEntry[];
}

export function MediaPreview({
  selectedMedia,
  folderTrail,
  folderDestinations,
  allMediaAssets,
}: MediaPreviewProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Manga Reader states
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isBookReaderOpen, setIsBookReaderOpen] = useState(false);
  const [archivePages, setArchivePages] = useState<ReaderPage[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [pdfPages, setPdfPages] = useState<ReaderPage[]>([]);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const previewUrl = getMediaAssetUrl(selectedMedia.r2Key);
  const previewKind = getMediaPreviewKind(selectedMedia.contentType, selectedMedia.filename);

  // Filter the media assets to those in the same folder and with the same preview kind
  const siblingMedia =
    previewKind !== "unsupported"
      ? allMediaAssets
          .filter(
            (m) =>
              m.folderId === (selectedMedia.folder?.id ?? null) &&
              getMediaPreviewKind(m.contentType, m.filename) === previewKind
          )
          .slice()
          .sort((a, b) => compareAlphanumeric(a.filename, b.filename))
      : [];

  const currentIndex = siblingMedia.findIndex((m) => m.id === selectedMedia.id);
  const prevMedia = currentIndex > 0 ? siblingMedia[currentIndex - 1] : null;
  const nextMedia =
    currentIndex >= 0 && currentIndex < siblingMedia.length - 1 ? siblingMedia[currentIndex + 1] : null;

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
    if (isReaderOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && prevHref) {
        window.history.pushState(null, "", prevHref);
        window.dispatchEvent(new CustomEvent("vault-navigate", { detail: { url: prevHref } }));
      } else if (e.key === "ArrowRight" && nextHref) {
        window.history.pushState(null, "", nextHref);
        window.dispatchEvent(new CustomEvent("vault-navigate", { detail: { url: nextHref } }));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevHref, nextHref, isReaderOpen]);

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
      window.history.pushState(null, "", nextHref);
      window.dispatchEvent(new CustomEvent("vault-navigate", { detail: { url: nextHref } }));
    } else if (isRightSwipe && prevHref) {
      window.history.pushState(null, "", prevHref);
      window.dispatchEvent(new CustomEvent("vault-navigate", { detail: { url: prevHref } }));
    }
  }

  const handleOpenArchiveReader = async () => {
    const url = getMediaAssetUrl(selectedMedia.r2Key);
    if (!url) return;

    setIsArchiveLoading(true);
    setArchiveError("");

    try {
      const { parseMangaArchive } = await import("@/lib/manga");
      const res = await fetch(url);
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

  const handleOpenPdfReader = async () => {
    if (!previewUrl) return;

    setIsPdfLoading(true);
    setPdfError("");

    try {
      const { parsePdfDocument } = await import("@/lib/pdf");
      const parsedPages = await parsePdfDocument(previewUrl);
      if (parsedPages.length === 0) {
        throw new Error("This PDF has no pages.");
      }
      setPdfPages(parsedPages);
      setIsReaderOpen(true);
    } catch (err) {
      console.error(err);
      setPdfError(err instanceof Error ? err.message : "Failed to open PDF.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const isAssetReader = archivePages.length > 0 || pdfPages.length > 0;
  const readerPages: ReaderPage[] =
    archivePages.length > 0
      ? archivePages
      : pdfPages.length > 0
        ? pdfPages
        : siblingMedia.map((m) => ({
            name: m.filename,
            url: getMediaAssetUrl(m.r2Key) || "",
          }));
  const readerTitle = isAssetReader
    ? selectedMedia.filename
    : selectedMedia.folder?.name || "Vault";

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
                {selectedMedia.contentType} · {formatBytes(selectedMedia.sizeBytes)}
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
                  <FilebucketPlayer src={previewUrl} type={selectedMedia.contentType} isVideo={false} />
                </div>
              );
            }

            if (previewKind === "video" && previewUrl) {
              return (
                <FilebucketPlayer src={previewUrl} type={selectedMedia.contentType} isVideo={true} />
              );
            }

            if (previewKind === "pdf" && previewUrl) {
              return (
                <div className="flex h-full w-full flex-col gap-2">
                  <div className="flex items-center justify-end gap-3">
                    {pdfError && (
                      <p className="text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 px-3 py-1.5 rounded-md">
                        {pdfError}
                      </p>
                    )}
                    <Button
                      className="h-8 gap-1.5 bg-purple-600 hover:bg-purple-500 text-white active:scale-95 transition-transform text-xs font-semibold"
                      disabled={isPdfLoading}
                      onClick={handleOpenPdfReader}
                      size="sm"
                      type="button"
                    >
                      {isPdfLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading PDF...
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-3.5 w-3.5" />
                          Open in Reader
                        </>
                      )}
                    </Button>
                  </div>
                  <iframe
                    src={previewUrl}
                    className="w-full flex-1 min-h-[calc(100vh-280px)] border-0 rounded-md bg-white shadow-md z-0"
                  />
                </div>
              );
            }

            if (previewKind === "text" && previewUrl) {
              return (
                <div className="w-full max-w-md rounded-md border border-slate-800 bg-[#191c22] p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-blue-950/40 text-blue-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-100">{selectedMedia.filename}</p>
                  <p className="mt-1 text-[10px] font-mono text-slate-400 mb-6">
                    {formatBytes(selectedMedia.sizeBytes)} · Text Document
                  </p>
                  <Button
                    className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white active:scale-95 transition-transform text-xs font-semibold gap-1.5"
                    onClick={() => setIsBookReaderOpen(true)}
                    type="button"
                  >
                    Open in Book Reader
                  </Button>
                </div>
              );
            }

            if (previewKind === "epub" && previewUrl) {
              return (
                <div className="w-full max-w-md rounded-md border border-slate-800 bg-[#191c22] p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-blue-950/40 text-blue-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-100">{selectedMedia.filename}</p>
                  <p className="mt-1 text-[10px] font-mono text-slate-400 mb-6">
                    {formatBytes(selectedMedia.sizeBytes)} · E-Book Document
                  </p>
                  <Button
                    className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white active:scale-95 transition-transform text-xs font-semibold gap-1.5"
                    onClick={() => setIsBookReaderOpen(true)}
                    type="button"
                  >
                    Open in Book Reader
                  </Button>
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
                    {formatBytes(selectedMedia.sizeBytes)} · Manga Archive
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
            setPdfPages([]);
          }}
          title={readerTitle}
          pages={readerPages}
          initialPageIndex={
            isAssetReader ? 0 : siblingMedia.findIndex((m) => m.id === selectedMedia.id)
          }
          mediaId={isAssetReader ? selectedMedia.id : undefined}
        />
      )}

      {isBookReaderOpen && (
        <BookReader
          isOpen={isBookReaderOpen}
          onClose={() => setIsBookReaderOpen(false)}
          title={selectedMedia.filename}
          url={getMediaAssetUrl(selectedMedia.r2Key) || ""}
          contentType={selectedMedia.contentType}
          mediaId={selectedMedia.id}
        />
      )}
    </div>
  );
}

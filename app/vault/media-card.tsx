"use client";

import Link from "next/link";

import { BookOpen, FileQuestion, FileText, ImagePlus, Music, Video } from "lucide-react";
import { CardActionsMenu } from "@/components/card-actions-menu";
import { cn, getMediaAssetUrl } from "@/lib/utils";
import { getMediaPreviewKind } from "./media-kind";
import { SelectionCheck } from "./selection-check";
import type { CardDragProps, ItemActions, MediaGridEntry } from "./vault-entries";

interface MediaCardProps {
  media: MediaGridEntry;
  aspect: "VIDEO" | "PORTRAIT" | "SQUARE";
  selectionMode: boolean;
  selected: boolean;
  destinations: { id: string; name: string }[];
  drag: CardDragProps;
  actions: ItemActions;
  onToggleSelect: () => void;
}

export function MediaCard({
  media,
  aspect,
  selectionMode,
  selected,
  destinations,
  drag,
  actions,
  onToggleSelect,
}: MediaCardProps) {
  const previewKind = getMediaPreviewKind(media.contentType, media.filename);
  const isImg = previewKind === "image";
  const isAudio = previewKind === "audio";
  const isVideo = previewKind === "video";
  const isPdf = previewKind === "pdf";
  const isEpub = previewKind === "epub";
  const isManga = previewKind === "archive";
  const isText = previewKind === "text";

  const hasThumbnail = Boolean(media.thumbnailKey);
  const thumbnailUrl = hasThumbnail ? getMediaAssetUrl(media.thumbnailKey!) : null;

  // All card frames in Files mode grid use configured aspect ratio
  const aspectClass =
    aspect === "PORTRAIT" ? "aspect-[3/4]" : aspect === "SQUARE" ? "aspect-square" : "aspect-video";
  const isBookLayout = isEpub || isPdf || isManga;

  const Icon = isImg
    ? ImagePlus
    : isAudio
    ? Music
    : isVideo
    ? Video
    : isPdf
    ? FileText
    : isEpub
    ? BookOpen
    : isManga
    ? BookOpen
    : isText
    ? FileText
    : FileQuestion;

  const colorClass = isImg
    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:bg-blue-500/20"
    : isAudio
    ? "bg-green-500/10 text-green-400 border-green-500/20 group-hover:bg-green-500/20"
    : isVideo
    ? "bg-orange-500/10 text-orange-400 border-orange-500/20 group-hover:bg-orange-500/20"
    : isPdf
    ? "bg-red-500/10 text-red-400 border-red-500/25 group-hover:bg-red-500/20"
    : isEpub || isManga
    ? "bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:bg-purple-500/20"
    : isText
    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 group-hover:bg-cyan-500/20"
    : "bg-slate-500/10 text-slate-400 border-slate-500/20 group-hover:bg-slate-500/20";

  const borderHoverClass = isImg
    ? "hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)]"
    : isAudio
    ? "hover:border-green-500/40 hover:shadow-[0_0_15px_rgba(34,197,94,0.05)]"
    : isVideo
    ? "hover:border-orange-500/40 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)]"
    : isPdf
    ? "hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.05)]"
    : isEpub || isManga
    ? "hover:border-purple-500/40 hover:shadow-[0_0_15px_rgba(139,92,246,0.05)]"
    : isText
    ? "hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]"
    : "hover:border-slate-500/40";

  const mediaUrl = getMediaAssetUrl(media.r2Key);

  const cardBody = (
    <>
      {/* Thumbnail / Media Frame */}
      <div className={cn("relative w-full rounded-lg overflow-hidden bg-[#0d0f14] border border-slate-800/60 mb-2 flex items-center justify-center", aspectClass)}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={media.filename}
            className={cn(
              "w-full h-full rounded-lg transition-transform group-hover:scale-105 duration-300",
              isBookLayout ? "object-contain bg-[#060709]" : "object-cover"
            )}
          />
        ) : isImg && mediaUrl ? (
          <img
            src={mediaUrl}
            alt={media.filename}
            className="w-full h-full object-cover rounded-lg transition-transform group-hover:scale-105 duration-300"
          />
        ) : isVideo && mediaUrl ? (
          <video
            src={mediaUrl}
            preload="metadata"
            className="w-full h-full object-cover rounded-lg"
          />
        ) : isText ? (
          <div className="w-full h-full flex flex-col justify-between p-3 bg-[#171a22] rounded-lg border border-slate-800/80 shadow-inner select-none">
            <div className="space-y-1.5 opacity-40">
              <div className="h-1 bg-slate-500 rounded w-5/6"></div>
              <div className="h-1 bg-slate-500 rounded w-full"></div>
              <div className="h-1 bg-slate-500 rounded w-3/4"></div>
              <div className="h-1 bg-slate-500 rounded w-4/5"></div>
              {(aspect === "PORTRAIT" || aspect === "SQUARE") && (
                <>
                  <div className="h-1 bg-slate-500 rounded w-2/3"></div>
                  <div className="h-1 bg-slate-500 rounded w-5/6"></div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400/70">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-[9px] font-mono uppercase tracking-wider font-semibold">TXT</span>
            </div>
          </div>
        ) : (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200", colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 px-1 pb-1">
        <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-slate-100 transition-colors" title={media.filename}>
          {media.filename}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-medium">
          {isImg ? "Image" : isVideo ? "Video" : isAudio ? "Audio" : isPdf ? "PDF" : isEpub ? "EPUB" : isManga ? "Manga" : isText ? "Text" : "File"}
        </p>
      </div>
    </>
  );

  const cardClassName = cn(
    "group relative flex flex-col justify-between p-2 rounded-xl border border-slate-800 bg-[#14161d]/50 hover:bg-[#1a1d26]/80",
    borderHoverClass,
    selectionMode && selected && "border-blue-500/70 bg-blue-500/10"
  );

  return (
    <div
      aria-pressed={selectionMode ? selected : undefined}
      className={cardClassName}
      data-bulk-item="media"
      data-selected={selected}
      draggable={selectionMode ? false : drag.draggable}
      onClick={() => {
        if (selectionMode) onToggleSelect();
      }}
      onDragStart={(e) => {
        if (selectionMode) return;
        drag.onDragStart?.(e);
      }}
      onKeyDown={(e) => {
        if (selectionMode && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggleSelect();
        }
      }}
      role={selectionMode ? "button" : undefined}
      tabIndex={selectionMode ? 0 : undefined}
    >
      {selectionMode && <SelectionCheck selected={selected} />}

      {/* Top-Right 3-dots actions menu for move/rename/delete without previewing */}
      {!selectionMode && (
        <div className="absolute top-3 right-3 z-20 opacity-80 group-hover:opacity-100 transition-opacity">
          <CardActionsMenu
            currentFolderId={media.folderId}
            currentName={media.filename}
            destinations={destinations}
            id={media.id}
            label={media.filename}
            onMove={actions.onMove}
            onRename={actions.onRename}
            onTrash={actions.onTrash}
          />
        </div>
      )}

      {selectionMode ? (
        <div className="block w-full">{cardBody}</div>
      ) : (
        <Link
          className="block w-full transition-all active:scale-95 duration-200"
          draggable={true}
          href={media.folderId ? `/?folder=${media.folderId}&media=${media.id}` : `/?media=${media.id}`}
        >
          {cardBody}
        </Link>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";

import { FileText } from "lucide-react";
import { CardActionsMenu } from "@/components/card-actions-menu";
import { cn } from "@/lib/utils";
import type { CardDragProps, ItemActions, NoteEntry } from "./vault-entries";

export function getNoteSnippet(body: string, limit = 80): string {
  if (!body) return "";
  // Strip basic markdown symbols for cleaner text snippets
  const plainText = body
    .replace(/[-*#_`>]/g, "")
    .replace(/\[[ xX]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length > limit ? plainText.substring(0, limit) + "..." : plainText;
}

interface NoteCardProps {
  note: NoteEntry;
  aspect: "VIDEO" | "PORTRAIT" | "SQUARE";
  destinations: { id: string; name: string }[];
  drag: CardDragProps;
  actions: ItemActions;
}

export function NoteCard({ note, aspect, destinations, drag, actions }: NoteCardProps) {
  const isPortrait = aspect === "PORTRAIT";
  const aspectClass =
    aspect === "PORTRAIT" ? "aspect-[3/4]" : aspect === "SQUARE" ? "aspect-square" : "aspect-video";

  const snippetLimit = isPortrait ? 150 : 80;
  const lineClampClass = isPortrait ? "line-clamp-6" : "line-clamp-4";
  const snippet = getNoteSnippet(note.body, snippetLimit);

  return (
    <div className="relative">
      <Link
        className="group flex flex-col justify-between p-3 rounded-xl border border-slate-800 bg-[#14161d]/50 hover:bg-[#1a1d26]/80 hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] transition-all active:scale-95 duration-200"
        draggable={drag.draggable}
        href={note.folderId ? `/?folder=${note.folderId}&note=${note.id}` : `/?note=${note.id}`}
        onDragStart={drag.onDragStart}
      >
        {/* Note stylized preview thumbnail */}
        <div className={cn("relative w-full rounded-lg overflow-hidden border border-blue-500/10 mb-2 bg-[#131018] select-none text-left", aspectClass)}>
          <div className="w-full h-full flex flex-col p-3">
            <p className={cn("text-[10px] text-blue-300/80 leading-relaxed font-normal overflow-hidden break-words", lineClampClass)}>
              {snippet || "Empty note"}
            </p>
            <div className="flex items-center gap-1.5 text-blue-400/70 mt-auto pt-1 border-t border-blue-500/10">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[9px] font-mono uppercase tracking-wider font-semibold">MD</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 px-1 pb-1">
          <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-slate-100 transition-colors" title={note.title}>
            {note.title}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-medium">
            Note
          </p>
        </div>
      </Link>
      <div className="absolute top-2 right-2 z-20">
        <CardActionsMenu
          currentFolderId={note.folderId}
          currentName={note.title}
          destinations={destinations}
          id={note.id}
          label={note.title}
          onMove={actions.onMove}
          onRename={actions.onRename}
          onTrash={actions.onTrash}
        />
      </div>
    </div>
  );
}

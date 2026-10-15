"use client";

import Link from "next/link";

import { Folder } from "lucide-react";
import { CardActionsMenu } from "@/components/card-actions-menu";
import { cn } from "@/lib/utils";
import { SelectionCheck } from "./selection-check";
import type { CardDragProps, FolderEntry, ItemActions } from "./vault-entries";

interface FolderCardProps {
  folder: FolderEntry;
  itemCount: number;
  selectionMode: boolean;
  selected: boolean;
  destinations: { id: string; name: string }[];
  isDragOver: boolean;
  drag: CardDragProps;
  actions: ItemActions;
  onToggleSelect: () => void;
}

export function FolderCard({
  folder,
  itemCount,
  selectionMode,
  selected,
  destinations,
  isDragOver,
  drag,
  actions,
  onToggleSelect,
}: FolderCardProps) {
  const cardClassName = cn(
    "group relative flex items-center justify-between h-14 px-4 rounded-xl border bg-[#14161d]/60 hover:bg-[#1a1d26] hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all active:scale-95 duration-200",
    isDragOver ? "border-amber-500 scale-95" : "border-slate-800/80",
    selectionMode && selected && "border-blue-500/70 bg-blue-500/10"
  );

  const cardBody = (
    <>
      {selectionMode && <SelectionCheck selected={selected} />}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:bg-amber-500/20 transition-all duration-200">
          <Folder className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
            {folder.name}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">({itemCount})</p>
        </div>
      </div>
    </>
  );

  if (selectionMode) {
    return (
      <div
        aria-pressed={selected}
        className={cardClassName}
        data-bulk-item="folder"
        data-selected={selected}
        onClick={onToggleSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleSelect();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {cardBody}
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        className={cardClassName}
        data-bulk-item="folder"
        data-selected={selected}
        draggable={drag.draggable}
        href={`/?folder=${folder.id}`}
        onDragLeave={drag.onDragLeave}
        onDragOver={drag.onDragOver}
        onDragStart={drag.onDragStart}
        onDrop={drag.onDrop}
      >
        {cardBody}
      </Link>
      <div className="absolute top-2 right-2 z-20">
        <CardActionsMenu
          currentFolderId={folder.parentId}
          currentName={folder.name}
          destinations={destinations}
          excludeIds={[folder.id]}
          id={folder.id}
          label={folder.name}
          onMove={actions.onMove}
          onRename={actions.onRename}
          onTrash={actions.onTrash}
        />
      </div>
    </div>
  );
}

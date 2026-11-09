"use client";

import { ReactNode, useEffect, useState } from "react";

import { FolderRow } from "@/app/folders/folder-row";
import { moveFolderAction } from "@/app/folders/actions";
import { NoteRow } from "@/app/notes/note-row";
import { moveNoteAction } from "@/app/notes/actions";
import { MediaRow } from "@/app/media/media-row";
import { moveMediaAssetAction } from "@/app/media/actions";
import { cn } from "@/lib/utils";
import { compareAlphanumeric } from "@/lib/sorting";
import { decideVaultMove } from "@/lib/vault-move-policy";
import { toastError, toastSuccess } from "@/components/ui/toast";

type BrowserTreeProps = {
  folders: {
    id: string;
    name: string;
    parentId: string | null;
    type?: string;
  }[];
  notes: {
    id: string;
    title: string;
    folderId: string | null;
  }[];
  mediaAssets: {
    id: string;
    filename: string;
    folderId: string | null;
  }[];
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  selectedMediaId: string | null;
  folderDestinations: {
    id: string;
    name: string;
  }[];
  isVaultRootActive: boolean;
  rootFolderId?: string | null;
  mode?: "FILES" | "NOTES" | "KEEP" | "CHAT";
};

export function BrowserTree({
  folderDestinations,
  folders,
  mediaAssets,
  notes,
  selectedFolderId,
  selectedMediaId,
  selectedNoteId,
  rootFolderId = null,
  mode = "FILES",
}: BrowserTreeProps) {
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null); // 'root' or folder ID
  const [isMounted, setIsMounted] = useState(false);

  // Grouping helpers
  const foldersByParent = new Map<string | null, typeof folders>();
  folders.forEach((f) => {
    const list = foldersByParent.get(f.parentId) || [];
    list.push(f);
    foldersByParent.set(f.parentId, list);
  });

  const notesByFolder = new Map<string | null, typeof notes>();
  notes.forEach((n) => {
    const list = notesByFolder.get(n.folderId) || [];
    list.push(n);
    notesByFolder.set(n.folderId, list);
  });

  const mediaByFolder = new Map<string | null, typeof mediaAssets>();
  mediaAssets.forEach((m) => {
    const list = mediaByFolder.get(m.folderId) || [];
    list.push(m);
    mediaByFolder.set(m.folderId, list);
  });

  function getLocationItemCount(folderId: string | null) {
    return (
      (foldersByParent.get(folderId)?.length ?? 0) +
      (notesByFolder.get(folderId)?.length ?? 0) +
      (mediaByFolder.get(folderId)?.length ?? 0)
    );
  }

  // Load expansion state
  useEffect(() => {
    const initial = new Set<string>();

    try {
      const stored = localStorage.getItem("filebucket_expanded_folders");
      if (stored) {
        JSON.parse(stored).forEach((id: string) => initial.add(id));
      }
    } catch (e) {
      console.warn("Failed to load folder expansion states", e);
    }

    // Auto-expand ancestors of currently active selection
    let activeFolderId = selectedFolderId;
    if (!activeFolderId && selectedNoteId) {
      activeFolderId = notes.find((n) => n.id === selectedNoteId)?.folderId ?? null;
    }
    if (!activeFolderId && selectedMediaId) {
      activeFolderId = mediaAssets.find((m) => m.id === selectedMediaId)?.folderId ?? null;
    }

    let checkId = activeFolderId;
    while (checkId) {
      initial.add(checkId);
      const parent = folders.find((f) => f.id === checkId);
      checkId = parent ? parent.parentId : null;
    }

    setExpandedFolderIds(initial);
    setIsMounted(true);
  }, [folders, mediaAssets, notes, selectedFolderId, selectedMediaId, selectedNoteId]);

  // Persist expansion state
  function toggleFolder(id: string) {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem("filebucket_expanded_folders", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // HTML5 Drag over & drop targets helper
  function handleDragOver(id: string | null, event: React.DragEvent) {
    event.preventDefault();
    setDragOverFolderId(id === null ? "root" : id);
  }

  function handleDragLeave() {
    setDragOverFolderId(null);
  }

  async function handleDrop(targetFolderId: string | null, event: React.DragEvent) {
    event.preventDefault();
    setDragOverFolderId(null);

    try {
      const rawData = event.dataTransfer.getData("application/filebucket");
      if (!rawData) return;
      const data = JSON.parse(rawData);

      const decision = decideVaultMove(data, targetFolderId, {
        folders,
        notes,
        media: mediaAssets,
      });
      if (decision.outcome === "ignore") return;
      if (decision.outcome === "reject") {
        toastError(decision.reason);
        return;
      }

      const formData = new FormData();
      if (data.type === "folder") {
        formData.append("folderId", data.id);
        formData.append("parentId", targetFolderId ?? "");
        await moveFolderAction(formData);
        toastSuccess("Moved");
      } else if (data.type === "note") {
        formData.append("noteId", data.id);
        formData.append("folderId", targetFolderId ?? "");
        await moveNoteAction(formData);
        toastSuccess("Moved");
      } else if (data.type === "media") {
        formData.append("mediaAssetId", data.id);
        formData.append("folderId", targetFolderId ?? "");
        await moveMediaAssetAction(formData);
        toastSuccess("Moved");
      }
    } catch (err) {
      console.error("Drop operation failed", err);
    }
  }

  // Recursive tree row builder with alphabetical sorting
  function renderVaultTree(parentId: string | null, depth: number): ReactNode[] {
    // Sort naturally (case-insensitive)
    const sortedFolders = (foldersByParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => compareAlphanumeric(a.name, b.name));

    const sortedNotes = (notesByFolder.get(parentId) ?? [])
      .slice()
      .sort((a, b) => compareAlphanumeric(a.title, b.title));

    const sortedMedia = (mediaByFolder.get(parentId) ?? [])
      .slice()
      .sort((a, b) => compareAlphanumeric(a.filename, b.filename));

    return [
      ...sortedFolders.flatMap((folder) => {
        const isActive = selectedFolderId === folder.id;
        const isExpanded = expandedFolderIds.has(folder.id);
        const childrenCount = getLocationItemCount(folder.id);
        const hasChildren = childrenCount > 0;

        return [
          <FolderRow
            key={`folder:${folder.id}`}
            depth={depth}
            destinations={folderDestinations}
            folder={{
              id: folder.id,
              name: folder.name,
              count: childrenCount,
              parentId: folder.parentId,
              type: folder.type,
            }}
            hasChildren={hasChildren}
            href={`/?folder=${folder.id}`}
            isActive={isActive}
            isDragOver={dragOverFolderId === folder.id}
            isExpanded={isExpanded}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => handleDragOver(folder.id, e)}
            onDrop={(e) => handleDrop(folder.id, e)}
            onToggle={() => toggleFolder(folder.id)}
            isChatChannel={mode === "CHAT"}
          />,
          // Only render children if folder is expanded
          ...(isExpanded ? renderVaultTree(folder.id, depth + 1) : []),
        ];
      }),
      ...(mode !== "FILES"
        ? sortedNotes.map((note) => {
            const isActive = selectedNoteId === note.id;
            const href = note.folderId
              ? `/?folder=${note.folderId}&note=${note.id}`
              : `/?note=${note.id}`;

            return (
              <NoteRow
                key={`note:${note.id}`}
                depth={depth}
                destinations={folderDestinations}
                href={href}
                isActive={isActive}
                note={{
                  id: note.id,
                  title: note.title,
                  folderId: note.folderId,
                }}
              />
            );
          })
        : []),
      ...(mode !== "FILES"
        ? sortedMedia.map((media) => {
            const isActive = selectedMediaId === media.id;
            const href = media.folderId
              ? `/?folder=${media.folderId}&media=${media.id}`
              : `/?media=${media.id}`;

            return (
              <MediaRow
                key={`media:${media.id}`}
                depth={depth}
                destinations={folderDestinations}
                href={href}
                isActive={isActive}
                mediaAsset={{
                  id: media.id,
                  filename: media.filename,
                  folderId: media.folderId,
                }}
              />
            );
          })
        : []),
    ];
  }

  // Prevent flash or hydration error with localStorage expanded state
  const treeNodes = isMounted ? renderVaultTree(rootFolderId, 0) : [];
  const isDragOverRoot = dragOverFolderId === "root" || (rootFolderId !== null && dragOverFolderId === rootFolderId);

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 mt-1 min-h-[150px] rounded-md transition-all",
        isDragOverRoot && "bg-blue-950/20 border border-dashed border-blue-500",
      )}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => handleDragOver(rootFolderId, e)}
      onDrop={(e) => handleDrop(rootFolderId, e)}
    >
      {isMounted ? (
        treeNodes.length > 0 ? (
          treeNodes
        ) : (
          <div className="px-3 py-5 text-sm text-slate-500 text-center">
            Your vault is empty
          </div>
        )
      ) : (
        <div className="px-3 py-5 text-sm text-slate-500 text-center animate-pulse">
          Loading tree...
        </div>
      )}
    </div>
  );
}

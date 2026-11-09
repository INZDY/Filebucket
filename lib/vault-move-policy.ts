import type { ViewMode } from "@/lib/mode";
import { getNoteFilename } from "@/lib/namespace/manager";

export type { ViewMode };

export type MoveItemType = "folder" | "note" | "media";

export type FolderLike = {
  id: string;
  name: string;
  parentId: string | null;
  type?: string | null;
};

export type NoteLike = {
  id: string;
  title: string;
  folderId: string | null;
};

export type MediaLike = {
  id: string;
  filename: string;
  folderId: string | null;
};

/** The vault lists a drop handler already holds, used to evaluate a move. */
export type MoveSnapshot = {
  folders: FolderLike[];
  notes: NoteLike[];
  media: MediaLike[];
};

/** The payload written to `dataTransfer` when a card starts dragging. */
export type DraggedItem = {
  type: MoveItemType;
  id: string;
};

export type MoveDecision =
  | { outcome: "ignore" }
  | { outcome: "allow" }
  | { outcome: "reject"; reason: string };

/**
 * The facts a caller without a full in-memory snapshot (the bulk server action)
 * resolves from the database before asking for a decision.
 */
export type MoveFacts = {
  type: MoveItemType;
  systemType?: string | null;
  currentMode: ViewMode;
  targetMode: ViewMode;
  nestsInsideItself?: boolean;
  nameTaken?: boolean;
};

const MOVE_ERRORS = {
  selfNesting: "Cannot move a folder inside itself or its sub-folders.",
  reserved: "Reserved system folders cannot be moved.",
  folderMode: "Folders cannot be moved across mode boundaries.",
  noteLocation: "Notes must reside within the Notes or Quick Notes directories.",
  noteMode: "Notes cannot be moved across Obsidian and Keep mode boundaries.",
  mediaLocked: "Chat attachments and Keep media files are locked within their respective roots.",
  collision: "An item with the same name already exists in the target folder.",
} as const;

export function getFolderMode(folders: FolderLike[], folderId: string | null): ViewMode {
  if (!folderId) return "FILES";
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  let current = folderMap.get(folderId);
  while (current) {
    if (current.type === "NOTES_ROOT") return "NOTES";
    if (current.type === "KEEP_ROOT") return "KEEP";
    if (current.type === "CHAT_ROOT") return "CHAT";
    current = current.parentId ? folderMap.get(current.parentId) : undefined;
  }
  return "FILES";
}

export function isFolderDescendant(
  folders: FolderLike[],
  draggedId: string,
  targetId: string | null
): boolean {
  if (!targetId) return false;
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const visited = new Set<string>();
  let current = folderMap.get(targetId);
  while (current && !visited.has(current.id)) {
    if (current.id === draggedId) return true;
    visited.add(current.id);
    current = current.parentId ? folderMap.get(current.parentId) : undefined;
  }
  return false;
}

function isNameTaken(
  dragged: DraggedItem,
  targetFolderId: string | null,
  snapshot: MoveSnapshot
): boolean {
  const { folders, notes, media } = snapshot;

  if (dragged.type === "folder") {
    const folder = folders.find((candidate) => candidate.id === dragged.id);
    if (!folder) return false;
    const name = folder.name.toLowerCase();
    return folders.some(
      (candidate) =>
        candidate.id !== dragged.id &&
        candidate.parentId === targetFolderId &&
        candidate.name.toLowerCase() === name
    );
  }

  if (dragged.type === "note") {
    const note = notes.find((candidate) => candidate.id === dragged.id);
    if (!note) return false;
    const filename = getNoteFilename(note.title).toLowerCase();
    const noteTaken = notes.some(
      (candidate) =>
        candidate.id !== dragged.id &&
        candidate.folderId === targetFolderId &&
        getNoteFilename(candidate.title).toLowerCase() === filename
    );
    const mediaTaken = media.some(
      (candidate) =>
        candidate.folderId === targetFolderId &&
        candidate.filename.toLowerCase() === filename
    );
    return noteTaken || mediaTaken;
  }

  const asset = media.find((candidate) => candidate.id === dragged.id);
  if (!asset) return false;
  const filename = asset.filename.toLowerCase();
  const noteTaken = notes.some(
    (candidate) =>
      candidate.folderId === targetFolderId &&
      getNoteFilename(candidate.title).toLowerCase() === filename
  );
  const mediaTaken = media.some(
    (candidate) =>
      candidate.id !== dragged.id &&
      candidate.folderId === targetFolderId &&
      candidate.filename.toLowerCase() === filename
  );
  return noteTaken || mediaTaken;
}

/**
 * Decides whether a drag-and-drop move is allowed, given the vault lists the
 * drop handler already has. A `reject` reason is shown to the user verbatim.
 */
export function decideVaultMove(
  dragged: DraggedItem,
  targetFolderId: string | null,
  snapshot: MoveSnapshot
): MoveDecision {
  if (dragged.id === targetFolderId) return { outcome: "ignore" };

  const { folders } = snapshot;
  const nameTaken = isNameTaken(dragged, targetFolderId, snapshot);
  const targetMode = getFolderMode(folders, targetFolderId);

  if (dragged.type === "folder") {
    const folder = snapshot.folders.find((candidate) => candidate.id === dragged.id);
    if (!folder) return { outcome: "allow" };
    return evaluateMoveFacts({
      type: "folder",
      systemType: folder.type,
      currentMode: getFolderMode(folders, folder.parentId),
      targetMode,
      nestsInsideItself: isFolderDescendant(folders, dragged.id, targetFolderId),
      nameTaken,
    });
  }

  if (dragged.type === "note") {
    const note = snapshot.notes.find((candidate) => candidate.id === dragged.id);
    if (!note) return { outcome: "allow" };
    return evaluateMoveFacts({
      type: "note",
      currentMode: getFolderMode(folders, note.folderId),
      targetMode,
      nameTaken,
    });
  }

  const asset = snapshot.media.find((candidate) => candidate.id === dragged.id);
  if (!asset) return { outcome: "allow" };
  return evaluateMoveFacts({
    type: "media",
    currentMode: getFolderMode(folders, asset.folderId),
    targetMode,
    nameTaken,
  });
}

/**
 * The move rules themselves, ordered so the user-facing reason matches the
 * folder contents drop handler. Callers supply facts they have already resolved.
 */
export function evaluateMoveFacts(facts: MoveFacts): MoveDecision {
  const {
    type,
    systemType,
    currentMode,
    targetMode,
    nestsInsideItself = false,
    nameTaken = false,
  } = facts;

  if (nestsInsideItself) {
    return { outcome: "reject", reason: MOVE_ERRORS.selfNesting };
  }

  if (type === "folder") {
    if (systemType && systemType !== "GENERAL") {
      return { outcome: "reject", reason: MOVE_ERRORS.reserved };
    }
    if (currentMode !== targetMode) {
      return { outcome: "reject", reason: MOVE_ERRORS.folderMode };
    }
  } else if (type === "note") {
    if (targetMode !== "NOTES" && targetMode !== "KEEP") {
      return { outcome: "reject", reason: MOVE_ERRORS.noteLocation };
    }
    if (currentMode !== "FILES" && currentMode !== targetMode) {
      return { outcome: "reject", reason: MOVE_ERRORS.noteMode };
    }
  } else if (
    currentMode === "KEEP" ||
    currentMode === "CHAT" ||
    targetMode === "KEEP" ||
    targetMode === "CHAT"
  ) {
    return { outcome: "reject", reason: MOVE_ERRORS.mediaLocked };
  }

  if (nameTaken) {
    return { outcome: "reject", reason: MOVE_ERRORS.collision };
  }

  return { outcome: "allow" };
}

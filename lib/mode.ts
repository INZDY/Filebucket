export type ViewMode = "FILES" | "NOTES" | "KEEP" | "CHAT";

interface Folder {
  id: string;
  parentId: string | null;
  type?: string;
}

interface Note {
  id: string;
  folderId: string | null;
}

interface MediaAsset {
  id: string;
  folderId: string | null;
  chatMessageId: string | null;
}

/** Traces a folder's type up to the root to find its mode. */
export function getFolderMode(folders: Folder[], folderId: string | null): ViewMode {
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

export function resolveViewMode(options: {
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  selectedMediaId: string | null;
  folders: Folder[];
  notes: Note[];
  mediaAssets: MediaAsset[];
}): ViewMode {
  const { selectedFolderId, selectedNoteId, selectedMediaId, folders, notes, mediaAssets } = options;

  // 1. Check selected media asset
  if (selectedMediaId) {
    const media = mediaAssets.find((m) => m.id === selectedMediaId);
    if (media) {
      if (media.chatMessageId) {
        return "CHAT";
      }
      return getFolderMode(folders, media.folderId);
    }
  }

  // 2. Check selected note
  if (selectedNoteId) {
    const note = notes.find((n) => n.id === selectedNoteId);
    if (note) {
      return getFolderMode(folders, note.folderId);
    }
  }

  // 3. Check selected folder
  if (selectedFolderId) {
    return getFolderMode(folders, selectedFolderId);
  }

  return "FILES";
}

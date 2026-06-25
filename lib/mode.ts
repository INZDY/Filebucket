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

export function resolveViewMode(options: {
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  selectedMediaId: string | null;
  folders: Folder[];
  notes: Note[];
  mediaAssets: MediaAsset[];
}): ViewMode {
  const { selectedFolderId, selectedNoteId, selectedMediaId, folders, notes, mediaAssets } = options;

  const folderMap = new Map(folders.map((f) => [f.id, f]));

  // Helper to trace folder type up to the root
  function getFolderMode(folderId: string | null): ViewMode {
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

  // 1. Check selected media asset
  if (selectedMediaId) {
    const media = mediaAssets.find((m) => m.id === selectedMediaId);
    if (media) {
      if (media.chatMessageId) {
        return "CHAT";
      }
      return getFolderMode(media.folderId);
    }
  }

  // 2. Check selected note
  if (selectedNoteId) {
    const note = notes.find((n) => n.id === selectedNoteId);
    if (note) {
      return getFolderMode(note.folderId);
    }
  }

  // 3. Check selected folder
  if (selectedFolderId) {
    return getFolderMode(selectedFolderId);
  }

  return "FILES";
}

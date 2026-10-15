"use client";

import { FolderContentsView } from "./folder-contents-view";
import { MediaPreview } from "./media-preview";
import { NotePreview } from "./note-preview";
import type { FolderEntry, MediaEntry, MediaGridEntry, NoteEntry, TagEntry } from "./vault-entries";

interface ActiveWorkspaceProps {
  selectedNote: NoteEntry | null;
  selectedMedia: MediaEntry | null;
  selectedFolder: FolderEntry | null;
  folderTrail: FolderEntry[];
  folderDestinations: { id: string; name: string }[];
  imageMediaAssets: { id: string; filename: string; location: string; url: string; folderId: string | null }[];
  tags: TagEntry[];
  allMediaAssets: MediaGridEntry[];
  allFolders?: FolderEntry[];
  allNotes?: NoteEntry[];
}

/**
 * The Main Content Pane switch: an opened note, an opened media asset, or the
 * Folder Contents View. Each branch is its own module.
 */
export function ActiveWorkspace({
  selectedNote,
  selectedMedia,
  selectedFolder,
  folderTrail,
  folderDestinations,
  imageMediaAssets,
  tags,
  allMediaAssets,
  allFolders = [],
  allNotes = [],
}: ActiveWorkspaceProps) {
  if (selectedNote) {
    return (
      <NotePreview
        folderDestinations={folderDestinations}
        folderTrail={folderTrail}
        imageMediaAssets={imageMediaAssets}
        selectedNote={selectedNote}
        tags={tags}
      />
    );
  }

  if (selectedMedia) {
    return (
      <MediaPreview
        allMediaAssets={allMediaAssets}
        folderDestinations={folderDestinations}
        folderTrail={folderTrail}
        selectedMedia={selectedMedia}
      />
    );
  }

  return (
    <FolderContentsView
      allFolders={allFolders}
      allMediaAssets={allMediaAssets}
      allNotes={allNotes}
      folderDestinations={folderDestinations}
      folderTrail={folderTrail}
      selectedFolder={selectedFolder}
    />
  );
}

"use client";

import Link from "next/link";

import { NoteEditor } from "@/app/notes/note-editor";
import { NoteActionsMenu } from "@/app/notes/note-actions-menu";
import type { FolderEntry, NoteEntry, TagEntry } from "./vault-entries";

interface NotePreviewProps {
  selectedNote: NoteEntry;
  folderTrail: FolderEntry[];
  folderDestinations: { id: string; name: string }[];
  imageMediaAssets: {
    id: string;
    filename: string;
    location: string;
    url: string;
    folderId: string | null;
  }[];
  tags: TagEntry[];
}

export function NotePreview({
  selectedNote,
  folderTrail,
  folderDestinations,
  imageMediaAssets,
  tags,
}: NotePreviewProps) {
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
              <span className="max-w-56 truncate font-medium text-slate-200">{selectedNote.title}</span>
            </div>
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
        updatedAt={selectedNote.updatedAt}
        allTags={tags}
        assignedTags={selectedNote.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name, slug: nt.tag.slug }))}
      />
    </div>
  );
}

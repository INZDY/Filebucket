"use client";

import { NoteEditor } from "@/app/notes/note-editor";
import { NoteActionsMenu } from "@/app/notes/note-actions-menu";
import { PageBreadcrumb, PageHeader } from "@/components/page-header";
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
      <PageHeader
        actions={<NoteActionsMenu note={selectedNote} destinations={folderDestinations} />}
        breadcrumb={
          <PageBreadcrumb
            items={[
              { name: "Vault", href: "/" },
              ...folderTrail.map((folder) => ({
                name: folder.name,
                href: `/?folder=${folder.id}`,
              })),
              { name: selectedNote.title },
            ]}
          />
        }
      />
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

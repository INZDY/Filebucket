export type TagEntry = {
  id: string;
  name: string;
  slug: string;
};

export type FolderEntry = {
  id: string;
  name: string;
  parentId: string | null;
  type?: string;
};

export type NoteEntry = {
  id: string;
  title: string;
  body: string;
  updatedAt: Date | string;
  folderId: string | null;
  tags: {
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
  folder?: {
    id: string;
    name: string;
  } | null;
};

export type MediaEntry = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string;
  thumbnailKey?: string | null;
  folder?: {
    id: string;
    name: string;
  } | null;
};

/**
 * Move/rename/trash behaviour for a vault item, built by the caller so card
 * modules stay presentation-only and never import a server action module.
 */
export type ItemActions = {
  onMove: (targetFolderId: string | null) => void | Promise<void>;
  onRename: (name: string) => void | Promise<void>;
  onTrash: () => void | Promise<void>;
};

/** Drag-and-drop handlers passed to a card's surface by its parent grid. */
export type CardDragProps = {
  draggable: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
};

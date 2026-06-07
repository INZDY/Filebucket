export interface VaultNamespaceStore {
  getSiblingFolders(userId: string, parentId: string | null): Promise<{ id: string; name: string }[]>;
  getSiblingNotes(userId: string, parentId: string | null): Promise<{ id: string; title: string }[]>;
  getSiblingMediaAssets(userId: string, parentId: string | null): Promise<{ id: string; filename: string }[]>;
  getFolderAncestry(userId: string, folderId: string): Promise<string[]>; // Returns list of ancestor folder IDs
  
  // Fetches all active entities in the vault to generate export paths in a single batch
  getAllActiveEntities(userId: string): Promise<{
    folders: { id: string; name: string; parentId: string | null }[];
    notes: { id: string; title: string; folderId: string | null }[];
    mediaAssets: { id: string; filename: string; folderId: string | null }[];
  }>;
}

export type EntityType = "Folder" | "Note" | "MediaAsset";

export interface EntitySpec {
  id?: string;             // Optional ID of the entity (used to exclude self when renaming/updating)
  type: EntityType;
  name: string;            // Note title (without extension) or Media Asset filename (with extension) or Folder name
}

export type ValidationError =
  | "NameCollision"        // Sibling name conflict in parent folder or Vault root
  | "InvalidCharacters"    // Name contains characters unsafe for directories or exports
  | "EmptyName"            // Name is empty or whitespace-only
  | "NameTooLong"          // Exceeds DB size limit (120 for Folder, 180 for Note, 255 for Media Asset)
  | "SelfNesting";         // Folder is moved inside itself or one of its descendants

export interface ValidationResult {
  isValid: boolean;
  error?: ValidationError;
}

export interface ResolveOptions {
  sanitize?: boolean;      // Replaces filesystem-unsafe characters (e.g. \ / : * ? " < > |) with "_"
}

export interface VaultPaths {
  folders: Map<string, string>;      // folderId -> relative path in zip (e.g. "Projects/Notes")
  notes: Map<string, string>;        // noteId -> relative path in zip (e.g. "Projects/Notes/Plan.md")
  mediaAssets: Map<string, string>;  // mediaId -> relative path in zip (e.g. "Projects/Notes/photo.png")
}

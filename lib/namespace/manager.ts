import { EntitySpec, ResolveOptions, ValidationResult, VaultPaths } from "./types";
import { VaultNamespaceStore } from "./store";

export function getNoteFilename(title: string): string {
  const trimmedTitle = title.trim() || "Untitled note";
  return trimmedTitle.toLowerCase().endsWith(".md") ? trimmedTitle : `${trimmedTitle}.md`;
}

export function sanitizeFilename(name: string): string {
  // Replace characters that are unsafe/invalid on common filesystems: \ / : * ? " < > |
  return name.replace(/[\\/:*?"<>|\x00-\x1F]/g, "_").trim();
}

export class VaultNamespaceManager {
  constructor(private store: VaultNamespaceStore) {}

  /**
   * Validates whether an entity's name is available and valid in the specified folder.
   */
  async validate(
    userId: string,
    parentId: string | null,
    entity: EntitySpec
  ): Promise<ValidationResult> {
    const name = entity.name.trim();

    // 1. Basic empty check
    if (!name) {
      return { isValid: false, error: "EmptyName" };
    }

    // 2. Length check
    let maxLength = 255;
    if (entity.type === "Folder") maxLength = 120;
    else if (entity.type === "Note") maxLength = 180;

    if (name.length > maxLength) {
      return { isValid: false, error: "NameTooLong" };
    }

    // 3. Invalid characters check
    if (/[\\/:*?"<>|\x00-\x1F]/.test(name)) {
      return { isValid: false, error: "InvalidCharacters" };
    }

    // 4. Folder self-nesting cycles
    if (entity.type === "Folder" && entity.id) {
      if (parentId === entity.id) {
        return { isValid: false, error: "SelfNesting" };
      }
      if (parentId) {
        const ancestry = await this.store.getFolderAncestry(userId, parentId);
        if (ancestry.includes(entity.id)) {
          return { isValid: false, error: "SelfNesting" };
        }
      }
    }

    // 5. Uniqueness checks
    if (entity.type === "Folder") {
      const siblingFolders = await this.store.getSiblingFolders(userId, parentId);
      const isCollision = siblingFolders.some(
        (f) => f.name.toLowerCase() === name.toLowerCase() && f.id !== entity.id
      );
      if (isCollision) {
        return { isValid: false, error: "NameCollision" };
      }
    } else {
      // Notes and Media Assets share a case-insensitive file namespace
      const [siblingNotes, siblingMedia] = await Promise.all([
        this.store.getSiblingNotes(userId, parentId),
        this.store.getSiblingMediaAssets(userId, parentId),
      ]);

      const targetFilename =
        entity.type === "Note" ? getNoteFilename(name) : name;

      const takenFilenames = new Set<string>();

      siblingNotes.forEach((n) => {
        if (entity.type === "Note" && n.id === entity.id) {
          return;
        }
        takenFilenames.add(getNoteFilename(n.title).toLowerCase());
      });

      siblingMedia.forEach((m) => {
        if (entity.type === "MediaAsset" && m.id === entity.id) {
          return;
        }
        takenFilenames.add(m.filename.toLowerCase());
      });

      if (takenFilenames.has(targetFilename.toLowerCase())) {
        return { isValid: false, error: "NameCollision" };
      }
    }

    return { isValid: true };
  }

  /**
   * Generates a unique, non-colliding name for a new entity. 
   * Appends sequential numeric suffixes on conflicts (e.g. "Note 2").
   */
  async resolve(
    userId: string,
    parentId: string | null,
    entity: Omit<EntitySpec, "id">,
    options?: ResolveOptions
  ): Promise<string> {
    let baseName = entity.name.trim() || (entity.type === "Note" ? "Untitled note" : "Untitled");
    
    if (options?.sanitize) {
      baseName = sanitizeFilename(baseName) || "Untitled";
    }

    let maxLength = 255;
    if (entity.type === "Folder") maxLength = 120;
    else if (entity.type === "Note") maxLength = 180;

    // Load existing items once to perform suffix calculations in-memory
    const takenNames = new Set<string>();

    if (entity.type === "Folder") {
      const siblingFolders = await this.store.getSiblingFolders(userId, parentId);
      siblingFolders.forEach((f) => takenNames.add(f.name.toLowerCase()));
    } else {
      const [siblingNotes, siblingMedia] = await Promise.all([
        this.store.getSiblingNotes(userId, parentId),
        this.store.getSiblingMediaAssets(userId, parentId),
      ]);
      siblingNotes.forEach((n) => takenNames.add(getNoteFilename(n.title).toLowerCase()));
      siblingMedia.forEach((m) => takenNames.add(m.filename.toLowerCase()));
    }

    let suffix = 1;
    let candidate = baseName;

    const getCandidateFilename = (name: string) => {
      if (entity.type === "Folder") return name.toLowerCase();
      if (entity.type === "Note") return getNoteFilename(name).toLowerCase();
      return name.toLowerCase();
    };

    while (true) {
      if (suffix === 1) {
        candidate = baseName;
      } else {
        if (entity.type === "MediaAsset") {
          const extIndex = baseName.lastIndexOf(".");
          const stem = extIndex !== -1 ? baseName.slice(0, extIndex) : baseName;
          const ext = extIndex !== -1 ? baseName.slice(extIndex) : "";
          candidate = `${stem} ${suffix}${ext}`;
        } else {
          candidate = `${baseName} ${suffix}`;
        }
      }

      // Ensure length safety, truncate stem if candidate name exceeds limit
      if (candidate.length > maxLength) {
        const suffixStr = suffix === 1 ? "" : ` ${suffix}`;
        if (entity.type === "MediaAsset") {
          const extIndex = baseName.lastIndexOf(".");
          const stem = extIndex !== -1 ? baseName.slice(0, extIndex) : baseName;
          const ext = extIndex !== -1 ? baseName.slice(extIndex) : "";
          const allowedStemLen = maxLength - suffixStr.length - ext.length;
          const truncatedStem = stem.slice(0, Math.max(1, allowedStemLen));
          candidate = `${truncatedStem}${suffixStr}${ext}`;
        } else {
          const allowedBaseLen = maxLength - suffixStr.length;
          const truncatedBase = baseName.slice(0, Math.max(1, allowedBaseLen));
          candidate = `${truncatedBase}${suffixStr}`;
        }
      }

      if (!takenNames.has(getCandidateFilename(candidate))) {
        break;
      }
      suffix++;
    }

    return candidate;
  }

  /**
   * Generates a flat map of unique, sanitized relative zip paths for all active vault items.
   * Ensures zero folder-file collisions inside the virtual structure.
   */
  async resolveVaultPaths(userId: string): Promise<VaultPaths> {
    const { folders, notes, mediaAssets } = await this.store.getAllActiveEntities(userId);

    // Build parent-children index maps
    const foldersByParent = new Map<string | null, typeof folders>();
    for (const folder of folders) {
      const pId = folder.parentId;
      const list = foldersByParent.get(pId) || [];
      list.push(folder);
      foldersByParent.set(pId, list);
    }

    const notesByFolder = new Map<string | null, typeof notes>();
    for (const note of notes) {
      const fId = note.folderId;
      const list = notesByFolder.get(fId) || [];
      list.push(note);
      notesByFolder.set(fId, list);
    }

    const mediaByFolder = new Map<string | null, typeof mediaAssets>();
    for (const media of mediaAssets) {
      const fId = media.folderId;
      const list = mediaByFolder.get(fId) || [];
      list.push(media);
      mediaByFolder.set(fId, list);
    }

    const folderPaths = new Map<string, string>(); // folderId -> relative path in zip

    // 1. Resolve folder paths top-down recursively, preventing duplicate sibling names
    const resolveFolderPathsRecursive = (parentId: string | null, parentPath: string) => {
      const children = foldersByParent.get(parentId) || [];
      const usedNames = new Set<string>();

      for (const child of children) {
        const sanitized = sanitizeFilename(child.name) || "Untitled folder";
        let uniqueName = sanitized;
        let suffix = 2;
        while (usedNames.has(uniqueName.toLowerCase())) {
          uniqueName = `${sanitized} ${suffix}`;
          suffix++;
        }
        usedNames.add(uniqueName.toLowerCase());

        const childPath = parentPath ? `${parentPath}/${uniqueName}` : uniqueName;
        folderPaths.set(child.id, childPath);
        resolveFolderPathsRecursive(child.id, childPath);
      }
    };

    resolveFolderPathsRecursive(null, "");

    // 2. Resolve notes and media asset filenames in each folder location
    const notePaths = new Map<string, string>();
    const mediaPaths = new Map<string, string>();

    const allLocations = [null, ...folders.map((f) => f.id)];

    for (const locationId of allLocations) {
      const folderPath = locationId ? folderPaths.get(locationId)! : "";
      const folderNotes = notesByFolder.get(locationId) || [];
      const folderMedia = mediaByFolder.get(locationId) || [];

      const usedNames = new Set<string>();

      // Prevent file names from colliding with sub-folder names in the same parent directory
      const childFolders = foldersByParent.get(locationId) || [];
      for (const child of childFolders) {
        const childFolderName = folderPaths.get(child.id)!.split("/").pop()!;
        usedNames.add(childFolderName.toLowerCase());
      }

      const getUniqueFilename = (baseName: string, extension: string): string => {
        const sanitized = sanitizeFilename(baseName) || "Untitled";
        let candidate = extension ? `${sanitized}${extension}` : sanitized;
        let suffix = 2;
        while (usedNames.has(candidate.toLowerCase())) {
          candidate = extension ? `${sanitized} ${suffix}${extension}` : `${sanitized} ${suffix}`;
          suffix++;
        }
        usedNames.add(candidate.toLowerCase());
        return candidate;
      };

      // Notes mapping (titles -> title.md)
      for (const note of folderNotes) {
        const filename = getUniqueFilename(note.title, ".md");
        const zipPath = folderPath ? `${folderPath}/${filename}` : filename;
        notePaths.set(note.id, zipPath);
      }

      // Media Assets mapping (keeps native extensions)
      for (const media of folderMedia) {
        const extIndex = media.filename.lastIndexOf(".");
        const base = extIndex !== -1 ? media.filename.slice(0, extIndex) : media.filename;
        const ext = extIndex !== -1 ? media.filename.slice(extIndex) : "";

        const filename = getUniqueFilename(base, ext);
        const zipPath = folderPath ? `${folderPath}/${filename}` : filename;
        mediaPaths.set(media.id, zipPath);
      }
    }

    return {
      folders: folderPaths,
      notes: notePaths,
      mediaAssets: mediaPaths,
    };
  }
}

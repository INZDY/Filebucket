import { describe, it, expect } from "vitest";
import { VaultNamespaceManager } from "../lib/namespace/manager";
import { VaultNamespaceStore } from "../lib/namespace/store";

class InMemoryNamespaceStore implements VaultNamespaceStore {
  folders: { id: string; name: string; parentId: string | null; userId: string }[] = [];
  notes: { id: string; title: string; folderId: string | null; userId: string }[] = [];
  mediaAssets: { id: string; filename: string; folderId: string | null; userId: string }[] = [];
  ancestry: Record<string, string[]> = {};

  async getSiblingFolders(userId: string, parentId: string | null) {
    return this.folders.filter((f) => f.userId === userId && f.parentId === parentId);
  }

  async getSiblingNotes(userId: string, parentId: string | null) {
    return this.notes.filter((n) => n.userId === userId && n.folderId === parentId);
  }

  async getSiblingMediaAssets(userId: string, parentId: string | null) {
    return this.mediaAssets.filter((m) => m.userId === userId && m.folderId === parentId);
  }

  async getFolderAncestry(userId: string, folderId: string) {
    return this.ancestry[folderId] ?? [];
  }

  async getAllActiveEntities(userId: string) {
    return {
      folders: this.folders.filter((f) => f.userId === userId),
      notes: this.notes.filter((n) => n.userId === userId),
      mediaAssets: this.mediaAssets.filter((m) => m.userId === userId),
    };
  }
}

describe("VaultNamespaceManager", () => {
  it("should validate a valid entity name", async () => {
    const store = new InMemoryNamespaceStore();
    const manager = new VaultNamespaceManager(store);

    const result = await manager.validate("user_1", null, {
      type: "Folder",
      name: "Projects",
    });

    expect(result.isValid).toBe(true);
  });

  it("should detect folder sibling collisions case-insensitively", async () => {
    const store = new InMemoryNamespaceStore();
    store.folders.push({ id: "f1", name: "Work", parentId: null, userId: "user_1" });

    const manager = new VaultNamespaceManager(store);

    const result1 = await manager.validate("user_1", null, {
      type: "Folder",
      name: "WORK",
    });
    expect(result1.isValid).toBe(false);
    expect(result1.error).toBe("NameCollision");

    // Collides with sibling but not in another folder
    const result2 = await manager.validate("user_1", "f1", {
      type: "Folder",
      name: "Work",
    });
    expect(result2.isValid).toBe(true);
  });

  it("should detect self-nesting cycles for folders", async () => {
    const store = new InMemoryNamespaceStore();
    store.ancestry["child_folder"] = ["parent_folder", "grandparent_folder"];

    const manager = new VaultNamespaceManager(store);

    const result = await manager.validate("user_1", "child_folder", {
      id: "parent_folder",
      type: "Folder",
      name: "Parent",
    });

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("SelfNesting");
  });

  it("should enforce shared filename namespace between Notes and MediaAssets", async () => {
    const store = new InMemoryNamespaceStore();
    store.mediaAssets.push({ id: "m1", filename: "Plan.md", folderId: null, userId: "user_1" });

    const manager = new VaultNamespaceManager(store);

    // Note titled "Plan" translates to file "Plan.md", so it should collide with "Plan.md" MediaAsset
    const result = await manager.validate("user_1", null, {
      type: "Note",
      name: "Plan",
    });

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("NameCollision");
  });

  it("should auto-suffix note titles on collisions", async () => {
    const store = new InMemoryNamespaceStore();
    store.notes.push({ id: "n1", title: "Untitled note", folderId: null, userId: "user_1" });

    const manager = new VaultNamespaceManager(store);

    const resolved = await manager.resolve("user_1", null, {
      type: "Note",
      name: "Untitled note",
    });

    expect(resolved).toBe("Untitled note 2");
  });

  it("should auto-suffix media assets preserving file extensions", async () => {
    const store = new InMemoryNamespaceStore();
    store.mediaAssets.push({ id: "m1", filename: "photo.png", folderId: null, userId: "user_1" });

    const manager = new VaultNamespaceManager(store);

    const resolved = await manager.resolve("user_1", null, {
      type: "MediaAsset",
      name: "photo.png",
    });

    expect(resolved).toBe("photo 2.png");
  });

  it("should calculate correct relative zip paths for exports", async () => {
    const store = new InMemoryNamespaceStore();
    store.folders.push({ id: "f1", name: "Projects", parentId: null, userId: "user_1" });
    store.notes.push({ id: "n1", title: "Plan", folderId: "f1", userId: "user_1" });
    store.mediaAssets.push({ id: "m1", filename: "photo.png", folderId: "f1", userId: "user_1" });

    const manager = new VaultNamespaceManager(store);
    const paths = await manager.resolveVaultPaths("user_1");

    expect(paths.folders.get("f1")).toBe("Projects");
    expect(paths.notes.get("n1")).toBe("Projects/Plan.md");
    expect(paths.mediaAssets.get("m1")).toBe("Projects/photo.png");
  });
});

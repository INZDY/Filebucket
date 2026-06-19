import { describe, it, expect } from "vitest";
import { resolveViewMode } from "@/lib/mode";

describe("resolveViewMode", () => {
  const folders = [
    { id: "notes-root-id", parentId: null, type: "NOTES_ROOT" },
    { id: "keep-root-id", parentId: null, type: "KEEP_ROOT" },
    { id: "chat-root-id", parentId: null, type: "CHAT_ROOT" },
    { id: "project-folder", parentId: "notes-root-id", type: "GENERAL" },
    { id: "gaming-channel", parentId: "chat-root-id", type: "GENERAL" },
    { id: "general-folder", parentId: null, type: "GENERAL" },
  ] as any[];

  it("should return FILES when nothing is selected", () => {
    const result = resolveViewMode({
      selectedFolderId: null,
      selectedNoteId: null,
      selectedMediaId: null,
      folders,
      notes: [],
      mediaAssets: [],
    });
    expect(result).toBe("FILES");
  });

  it("should return FILES when a general folder is selected", () => {
    const result = resolveViewMode({
      selectedFolderId: "general-folder",
      selectedNoteId: null,
      selectedMediaId: null,
      folders,
      notes: [],
      mediaAssets: [],
    });
    expect(result).toBe("FILES");
  });

  it("should return NOTES when notes root is selected", () => {
    const result = resolveViewMode({
      selectedFolderId: "notes-root-id",
      selectedNoteId: null,
      selectedMediaId: null,
      folders,
      notes: [],
      mediaAssets: [],
    });
    expect(result).toBe("NOTES");
  });

  it("should return NOTES when a folder under notes root is selected", () => {
    const result = resolveViewMode({
      selectedFolderId: "project-folder",
      selectedNoteId: null,
      selectedMediaId: null,
      folders,
      notes: [],
      mediaAssets: [],
    });
    expect(result).toBe("NOTES");
  });

  it("should return KEEP when keep root is selected", () => {
    const result = resolveViewMode({
      selectedFolderId: "keep-root-id",
      selectedNoteId: null,
      selectedMediaId: null,
      folders,
      notes: [],
      mediaAssets: [],
    });
    expect(result).toBe("KEEP");
  });

  it("should return CHAT when chat root is selected", () => {
    const result = resolveViewMode({
      selectedFolderId: "chat-root-id",
      selectedNoteId: null,
      selectedMediaId: null,
      folders,
      notes: [],
      mediaAssets: [],
    });
    expect(result).toBe("CHAT");
  });

  it("should return CHAT when a channel folder under chat root is selected", () => {
    const result = resolveViewMode({
      selectedFolderId: "gaming-channel",
      selectedNoteId: null,
      selectedMediaId: null,
      folders,
      notes: [],
      mediaAssets: [],
    });
    expect(result).toBe("CHAT");
  });

  it("should return KEEP when a keep note is selected", () => {
    const notes = [
      { id: "note-1", folderId: "keep-root-id" },
    ] as any[];
    const result = resolveViewMode({
      selectedFolderId: null,
      selectedNoteId: "note-1",
      selectedMediaId: null,
      folders,
      notes,
      mediaAssets: [],
    });
    expect(result).toBe("KEEP");
  });

  it("should return NOTES when an obsidian note is selected", () => {
    const notes = [
      { id: "note-2", folderId: "project-folder" },
    ] as any[];
    const result = resolveViewMode({
      selectedFolderId: null,
      selectedNoteId: "note-2",
      selectedMediaId: null,
      folders,
      notes,
      mediaAssets: [],
    });
    expect(result).toBe("NOTES");
  });

  it("should return FILES when a media asset under general storage is selected", () => {
    const mediaAssets = [
      { id: "media-1", folderId: "general-folder", chatMessageId: null },
    ] as any[];
    const result = resolveViewMode({
      selectedFolderId: null,
      selectedNoteId: null,
      selectedMediaId: "media-1",
      folders,
      notes: [],
      mediaAssets,
    });
    expect(result).toBe("FILES");
  });

  it("should return CHAT when a media asset is linked to a chat message", () => {
    const mediaAssets = [
      { id: "media-2", folderId: null, chatMessageId: "msg-123" },
    ] as any[];
    const result = resolveViewMode({
      selectedFolderId: null,
      selectedNoteId: null,
      selectedMediaId: "media-2",
      folders,
      notes: [],
      mediaAssets,
    });
    expect(result).toBe("CHAT");
  });
});

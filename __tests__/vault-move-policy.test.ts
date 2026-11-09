import { describe, it, expect } from "vitest";
import {
  decideVaultMove,
  evaluateMoveFacts,
  isFolderDescendant,
  type MoveSnapshot,
  type MoveFacts,
} from "@/lib/vault-move-policy";
import { getFolderMode } from "@/lib/mode";

const folders = [
  { id: "notes-root", name: "Notes", parentId: null, type: "NOTES_ROOT" },
  { id: "keep-root", name: "Quick Notes", parentId: null, type: "KEEP_ROOT" },
  { id: "chat-root", name: "Chat Channels", parentId: null, type: "CHAT_ROOT" },
  { id: "proj", name: "Projects", parentId: null, type: "GENERAL" },
  { id: "proj-sub", name: "Archive", parentId: "proj", type: "GENERAL" },
  { id: "notes-work", name: "Work", parentId: "notes-root", type: "GENERAL" },
  { id: "general", name: "General", parentId: null, type: "GENERAL" },
];

const notes = [
  { id: "note-files", title: "Loose", folderId: null },
  { id: "note-proj", title: "Plan", folderId: "proj" },
  { id: "note-notes", title: "Meeting", folderId: "notes-root" },
  { id: "note-keep", title: "Quick", folderId: "keep-root" },
];

const media = [
  { id: "media-files", filename: "pic.png", folderId: null },
  { id: "media-proj", filename: "diagram.png", folderId: "proj" },
  { id: "media-notes", filename: "scan.png", folderId: "notes-root" },
  { id: "media-keep", filename: "locked.png", folderId: "keep-root" },
  { id: "media-chat", filename: "attachment.png", folderId: "chat-root" },
];

const snapshot: MoveSnapshot = { folders, notes, media };

function decisionFor(type: "folder" | "note" | "media", id: string, targetFolderId: string | null) {
  return decideVaultMove({ type, id }, targetFolderId, snapshot);
}

describe("decideVaultMove", () => {
  it("ignores a folder dropped onto itself", () => {
    expect(decisionFor("folder", "proj", "proj")).toEqual({ outcome: "ignore" });
  });

  it("rejects a folder dropped inside itself or a descendant", () => {
    expect(decisionFor("folder", "proj", "proj-sub")).toEqual({
      outcome: "reject",
      reason: "Cannot move a folder inside itself or its sub-folders.",
    });
  });

  it("rejects moving a reserved system folder", () => {
    expect(decisionFor("folder", "notes-root", "general")).toEqual({
      outcome: "reject",
      reason: "Reserved system folders cannot be moved.",
    });
  });

  it("allows a general folder to move within Files Mode", () => {
    expect(decisionFor("folder", "general", "proj")).toEqual({ outcome: "allow" });
  });

  it("rejects a folder crossing a mode boundary", () => {
    expect(decisionFor("folder", "proj", "notes-work")).toEqual({
      outcome: "reject",
      reason: "Folders cannot be moved across mode boundaries.",
    });
  });

  it("rejects a note dropped outside Notes or Quick Notes", () => {
    expect(decisionFor("note", "note-files", "proj")).toEqual({
      outcome: "reject",
      reason: "Notes must reside within the Notes or Quick Notes directories.",
    });
  });

  it("rejects a note crossing the Obsidian and Keep boundary", () => {
    expect(decisionFor("note", "note-notes", "keep-root")).toEqual({
      outcome: "reject",
      reason: "Notes cannot be moved across Obsidian and Keep mode boundaries.",
    });
  });

  it("allows a loose note to move into Notes", () => {
    expect(decisionFor("note", "note-files", "notes-work")).toEqual({ outcome: "allow" });
  });

  it("allows a note to move within Notes", () => {
    expect(decisionFor("note", "note-notes", "notes-work")).toEqual({ outcome: "allow" });
  });

  it("rejects media moves into or out of Keep and Chat", () => {
    const locked = {
      outcome: "reject",
      reason: "Chat attachments and Keep media files are locked within their respective roots.",
    };
    expect(decisionFor("media", "media-keep", "general")).toEqual(locked);
    expect(decisionFor("media", "media-files", "keep-root")).toEqual(locked);
    expect(decisionFor("media", "media-chat", "general")).toEqual(locked);
    expect(decisionFor("media", "media-files", "chat-root")).toEqual(locked);
  });

  it("allows media to cross between Files Mode and Notes", () => {
    expect(decisionFor("media", "media-files", "notes-work")).toEqual({ outcome: "allow" });
    expect(decisionFor("media", "media-notes", "general")).toEqual({ outcome: "allow" });
  });

  it("rejects a folder whose name collides case-insensitively in the target", () => {
    const withTwin = {
      ...snapshot,
      folders: [
        ...folders,
        { id: "general-2", name: "Projects", parentId: null, type: "GENERAL" },
        { id: "twin", name: "projects", parentId: "proj", type: "GENERAL" },
      ],
    };
    expect(decideVaultMove({ type: "folder", id: "general-2" }, "proj", withTwin)).toEqual({
      outcome: "reject",
      reason: "An item with the same name already exists in the target folder.",
    });
  });

  it("rejects a note colliding with a media filename in the target", () => {
    const withMedia = {
      ...snapshot,
      notes: [{ id: "note-files", title: "Docs", folderId: null }],
      media: [...media, { id: "media-docs", filename: "docs.md", folderId: "notes-work" }],
    };
    expect(decideVaultMove({ type: "note", id: "note-files" }, "notes-work", withMedia)).toEqual({
      outcome: "reject",
      reason: "An item with the same name already exists in the target folder.",
    });
  });

  it("rejects media colliding with a note filename in the target", () => {
    const withNote = {
      ...snapshot,
      notes: [...notes, { id: "note-brief", title: "Brief", folderId: "proj" }],
      media: [...media, { id: "media-brief", filename: "brief.md", folderId: null }],
    };
    expect(decideVaultMove({ type: "media", id: "media-brief" }, "proj", withNote)).toEqual({
      outcome: "reject",
      reason: "An item with the same name already exists in the target folder.",
    });
  });

  it("does not collide with the item being moved", () => {
    expect(decisionFor("folder", "proj", null)).toEqual({ outcome: "allow" });
    const withNote = {
      ...snapshot,
      notes: [...notes, { id: "note-work", title: "Standup", folderId: "notes-work" }],
    };
    expect(
      decideVaultMove({ type: "note", id: "note-work" }, "notes-work", withNote)
    ).toEqual({ outcome: "allow" });
    expect(decisionFor("media", "media-notes", "notes-root")).toEqual({ outcome: "allow" });
  });

  it("lets an item missing from the snapshot through, matching the callers' stale-list behaviour", () => {
    expect(decisionFor("note", "missing-note", "notes-work")).toEqual({ outcome: "allow" });
  });
});

describe("getFolderMode", () => {
  it("resolves the mode from the folder's ancestry", () => {
    expect(getFolderMode(folders, null)).toBe("FILES");
    expect(getFolderMode(folders, "proj-sub")).toBe("FILES");
    expect(getFolderMode(folders, "notes-work")).toBe("NOTES");
    expect(getFolderMode(folders, "keep-root")).toBe("KEEP");
    expect(getFolderMode(folders, "chat-root")).toBe("CHAT");
  });
});

describe("isFolderDescendant", () => {
  it("treats the folder itself and its descendants as descendants", () => {
    expect(isFolderDescendant(folders, "proj", "proj")).toBe(true);
    expect(isFolderDescendant(folders, "proj", "proj-sub")).toBe(true);
    expect(isFolderDescendant(folders, "proj", "general")).toBe(false);
    expect(isFolderDescendant(folders, "proj", null)).toBe(false);
  });
});

describe("evaluateMoveFacts", () => {
  const facts = (overrides: Partial<MoveFacts> = {}): MoveFacts => ({
    type: "folder",
    systemType: "GENERAL",
    currentMode: "FILES",
    targetMode: "FILES",
    nestsInsideItself: false,
    nameTaken: false,
    ...overrides,
  });

  it("allows a clean move", () => {
    expect(evaluateMoveFacts(facts())).toEqual({ outcome: "allow" });
  });

  it("rejects self-nesting before anything else", () => {
    expect(evaluateMoveFacts(facts({ nestsInsideItself: true, systemType: "NOTES_ROOT" }))).toEqual({
      outcome: "reject",
      reason: "Cannot move a folder inside itself or its sub-folders.",
    });
  });

  it("rejects reserved folders", () => {
    expect(evaluateMoveFacts(facts({ systemType: "KEEP_ROOT" }))).toEqual({
      outcome: "reject",
      reason: "Reserved system folders cannot be moved.",
    });
  });

  it("applies the note mode rules", () => {
    expect(
      evaluateMoveFacts(facts({ type: "note", systemType: null, targetMode: "FILES" }))
    ).toEqual({
      outcome: "reject",
      reason: "Notes must reside within the Notes or Quick Notes directories.",
    });
    expect(
      evaluateMoveFacts(facts({ type: "note", systemType: null, currentMode: "NOTES", targetMode: "KEEP" }))
    ).toEqual({
      outcome: "reject",
      reason: "Notes cannot be moved across Obsidian and Keep mode boundaries.",
    });
  });

  it("locks media inside Keep and Chat", () => {
    expect(
      evaluateMoveFacts(facts({ type: "media", systemType: null, currentMode: "KEEP" }))
    ).toEqual({
      outcome: "reject",
      reason: "Chat attachments and Keep media files are locked within their respective roots.",
    });
  });

  it("rejects collisions last", () => {
    expect(evaluateMoveFacts(facts({ nameTaken: true }))).toEqual({
      outcome: "reject",
      reason: "An item with the same name already exists in the target folder.",
    });
  });
});

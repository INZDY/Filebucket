import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { SidebarBrowser } from "@/app/vault/sidebar-browser";

// Mock server actions to avoid dependency issues in unit tests
vi.mock("@/app/folders/actions", () => ({
  createFolderAction: vi.fn(),
  restoreFolderAction: vi.fn(),
  deleteFolderAction: vi.fn(),
  emptyTrashAction: vi.fn(),
}));
vi.mock("@/app/notes/actions", () => ({
  createNoteAction: vi.fn(),
  importMarkdownNotesAction: vi.fn(),
  restoreNoteAction: vi.fn(),
  deleteNoteAction: vi.fn(),
}));
vi.mock("@/app/media/actions", () => ({
  restoreMediaAssetAction: vi.fn(),
  deleteMediaAssetAction: vi.fn(),
}));
vi.mock("@/app/tags/actions", () => ({
  deleteTagAction: vi.fn(),
  renameTagAction: vi.fn(),
}));

describe("SidebarBrowser Global Explorer & Action Toolbar", () => {
  const folders = [
    { id: "notes-root", name: "Notes", parentId: null, type: "NOTES_ROOT" },
    { id: "keep-root", name: "Quick Notes", parentId: null, type: "KEEP_ROOT" },
    { id: "chat-root", name: "Chat Channels", parentId: null, type: "CHAT_ROOT" },
    { id: "notes-sub", name: "Work Projects", parentId: "notes-root", type: "GENERAL" },
    { id: "custom-folder", name: "Custom files", parentId: null, type: "GENERAL" },
  ];

  const notes = [
    { id: "note-1", title: "Project Plan", folderId: "notes-sub" },
    { id: "root-note", title: "Root Note Title", folderId: null },
  ];

  const mediaAssets = [
    { id: "media-1", filename: "logo.png", folderId: "custom-folder" },
    { id: "root-media", filename: "root-file.png", folderId: null },
  ];

  const defaultProps = {
    userId: "user-123",
    isTrashView: false,
    query: "",
    activeTagSlug: "",
    activeTag: null,
    selectedFolder: null,
    selectedNote: null,
    selectedMedia: null,
    selectedDeletedFolder: null,
    selectedDeletedNote: null,
    selectedDeletedMedia: null,
    folders,
    deletedFolders: [],
    deletedNotes: [],
    deletedMediaAssets: [],
    tags: [],
    notes,
    mediaAssets,
    folderTrail: [],
    folderDestinations: [],
    matchingFolders: [],
    isFilteredView: false,
    isVaultRootActive: true,
    browserTitle: "Vault",
    trashCount: 0,
    returnTo: "/",
  };

  it("should hide reserved/special folders in the Files Mode tree by default, and show them when toggled", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidebarBrowser
          {...defaultProps}
          activeMode="FILES"
        />
      );
    });

    // Hidden by default
    let textContent = container.textContent || "";
    expect(textContent).not.toContain("Notes");
    expect(textContent).not.toContain("Quick Notes");
    expect(textContent).not.toContain("Chat Channels");

    // Check for the toggle button in the toolbar
    const toggleBtn = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.getAttribute("title")?.toLowerCase().includes("special")
    );
    expect(toggleBtn).not.toBeUndefined();

    // Click the toggle button to show special folders
    await act(async () => {
      toggleBtn?.click();
    });

    // Now they should be shown
    textContent = container.textContent || "";
    expect(textContent).toContain("Notes");
    expect(textContent).toContain("Quick Notes");
    expect(textContent).toContain("Chat Channels");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should render only folders in the Files Mode tree, filtering out notes and media assets", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidebarBrowser
          {...defaultProps}
          activeMode="FILES"
        />
      );
    });

    // Notes and Media assets should be hidden from the tree view in Files Mode
    const textContent = container.textContent || "";
    expect(textContent).not.toContain("Root Note Title");
    expect(textContent).not.toContain("root-file.png");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should filter toolbar actions in FILES Mode (hide new note & import)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidebarBrowser
          {...defaultProps}
          activeMode="FILES"
        />
      );
    });

    // Verify New Folder and Upload Media are present, but Create Note/Import are missing
    const buttons = container.querySelectorAll("button");
    const titles = Array.from(buttons).map((btn) => btn.getAttribute("title") || btn.getAttribute("aria-label") || "");
    
    expect(titles).toContain("New folder");
    expect(titles).toContain("Upload media"); // From MediaUploadControl
    expect(titles).not.toContain("New note");
    expect(titles).not.toContain("Import Markdown notes");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should show all toolbar actions in NOTES Mode", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidebarBrowser
          {...defaultProps}
          activeMode="NOTES"
        />
      );
    });

    const buttons = container.querySelectorAll("button");
    const titles = Array.from(buttons).map((btn) => btn.getAttribute("title") || "");
    
    expect(titles).toContain("New note");
    expect(titles).toContain("New folder");
    expect(titles).toContain("Upload media");
    expect(titles).toContain("Import Markdown notes");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should only show New Channel in CHAT Mode", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidebarBrowser
          {...defaultProps}
          activeMode="CHAT"
          selectedFolder={{ id: "chat-root", name: "Chat Channels", parentId: null, type: "CHAT_ROOT" }}
        />
      );
    });

    const buttons = container.querySelectorAll("button");
    const titles = Array.from(buttons).map((btn) => btn.getAttribute("title") || "");
    
    expect(titles).toContain("New channel");
    expect(titles).not.toContain("New note");
    expect(titles).not.toContain("Upload file");
    expect(titles).not.toContain("Import Markdown notes");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should not render the static 'Vault Browser' header text", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidebarBrowser
          {...defaultProps}
          activeMode="FILES"
        />
      );
    });

    const textContent = container.textContent || "";
    expect(textContent).not.toContain("Vault Browser");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

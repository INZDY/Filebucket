import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { BrowserTree } from "@/app/vault/browser-tree";

// Mock server actions to avoid dependency issues in unit tests
vi.mock("@/app/folders/actions", () => ({
  moveFolderAction: vi.fn(),
}));
vi.mock("@/app/notes/actions", () => ({
  moveNoteAction: vi.fn(),
}));
vi.mock("@/app/media/actions", () => ({
  moveMediaAssetAction: vi.fn(),
}));

describe("BrowserTree Topmost Root Hiding", () => {
  const folders = [
    { id: "notes-root", name: "Notes", parentId: null, type: "NOTES_ROOT" },
    { id: "keep-root", name: "Quick Notes", parentId: null, type: "KEEP_ROOT" },
    { id: "chat-root", name: "Chat Channels", parentId: null, type: "CHAT_ROOT" },
    { id: "sub-folder-1", name: "Sub Folder 1", parentId: null, type: "GENERAL" },
    { id: "notes-sub", name: "Work Projects", parentId: "notes-root", type: "GENERAL" },
  ];

  const notes = [
    { id: "note-1", title: "Project Plan", folderId: "notes-sub" },
    { id: "root-note", title: "Root Note Title", folderId: null },
  ];

  const mediaAssets = [
    { id: "root-media", filename: "root-file.png", folderId: null },
  ];

  const folderDestinations = [
    { id: "sub-folder-1", name: "Sub Folder 1" },
  ];

  it("should not render the topmost 'Vault' root folder row in FILES Mode, but should render its children", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BrowserTree
          folders={folders.filter(f => f.type === "GENERAL")} // Just custom folders
          notes={notes}
          mediaAssets={mediaAssets}
          selectedFolderId={null}
          selectedNoteId={null}
          selectedMediaId={null}
          folderDestinations={folderDestinations}
          isVaultRootActive={true}
          rootFolderId={null}
          mode="FILES"
        />
      );
    });

    const textContent = container.textContent || "";
    // Topmost root folder "Vault" should not be rendered
    expect(textContent).not.toContain("Vault");
    
    // First-level children under root should be rendered
    expect(textContent).toContain("Sub Folder 1");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should render first-level folders with depth 0 when topmost root is hidden", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BrowserTree
          folders={folders.filter(f => f.type === "GENERAL")}
          notes={[]}
          mediaAssets={[]}
          selectedFolderId={null}
          selectedNoteId={null}
          selectedMediaId={null}
          folderDestinations={folderDestinations}
          isVaultRootActive={false}
          rootFolderId={null}
          mode="FILES"
        />
      );
    });

    // Check depth padding of the folder row "Sub Folder 1".
    // FolderRow depth is passed down to FolderRow.
    // In FolderRow: style={{ paddingLeft: `${4 + depth * 16}px` }}
    // For depth 0, it should be 4px.
    const formElement = container.querySelector("form");
    const divElement = container.querySelector(".group");
    
    // Find the elements inside the folder row
    const indentDiv = container.querySelector("[style*='padding-left']");
    expect(indentDiv).not.toBeNull();
    const styleAttr = indentDiv?.getAttribute("style") || "";
    expect(styleAttr).toContain("padding-left: 4px");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should support drag-over and drop on the root container", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const { moveFolderAction } = await import("@/app/folders/actions");
    const moveFolderMock = vi.mocked(moveFolderAction);
    moveFolderMock.mockClear();

    await act(async () => {
      root.render(
        <BrowserTree
          folders={folders.filter(f => f.type === "GENERAL")}
          notes={[]}
          mediaAssets={[]}
          selectedFolderId={null}
          selectedNoteId={null}
          selectedMediaId={null}
          folderDestinations={folderDestinations}
          isVaultRootActive={false}
          rootFolderId={null}
          mode="FILES"
        />
      );
    });

    const dropZone = container.querySelector(".min-h-\\[150px\\]");
    expect(dropZone).not.toBeNull();

    // Trigger dragover
    const dragOverEvent = new Event("dragover", { bubbles: true }) as any;
    dragOverEvent.preventDefault = vi.fn();
    dragOverEvent.dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(),
    };
    
    await act(async () => {
      dropZone?.dispatchEvent(dragOverEvent);
    });

    expect(dragOverEvent.preventDefault).toHaveBeenCalled();

    // Trigger drop
    const dropEvent = new Event("drop", { bubbles: true }) as any;
    dropEvent.preventDefault = vi.fn();
    const data = JSON.stringify({ type: "folder", id: "sub-folder-1" });
    dropEvent.dataTransfer = {
      getData: () => data,
    };

    await act(async () => {
      dropZone?.dispatchEvent(dropEvent);
    });

    expect(moveFolderMock).toHaveBeenCalled();
    const mockCalls = moveFolderMock.mock.calls;
    expect(mockCalls.length).toBeGreaterThan(0);
    const formData = mockCalls[0][0] as FormData;
    expect(formData.get("folderId")).toBe("sub-folder-1");
    expect(formData.get("parentId")).toBe(""); // root parentId is empty string

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

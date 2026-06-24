import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ActiveWorkspace } from "@/app/vault/active-workspace";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock next/link to delegate to mockPush
vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          if (onClick) onClick(e);
          mockPush(href || "");
        }}
        {...props}
      >
        {children}
      </a>
    );
  },
}));

// Mock action modules to avoid server-side dependency issues
vi.mock("@/app/folders/actions", () => ({
  createFolderAction: vi.fn(),
  restoreFolderAction: vi.fn(),
  deleteFolderAction: vi.fn(),
  emptyTrashAction: vi.fn(),
  moveFolderAction: vi.fn(),
}));
vi.mock("@/app/notes/actions", () => ({
  createNoteAction: vi.fn(),
  importMarkdownNotesAction: vi.fn(),
  restoreNoteAction: vi.fn(),
  deleteNoteAction: vi.fn(),
  moveNoteAction: vi.fn(),
}));
vi.mock("@/app/media/actions", () => ({
  restoreMediaAssetAction: vi.fn(),
  deleteMediaAssetAction: vi.fn(),
  moveMediaAssetAction: vi.fn(),
}));
vi.mock("@/app/tags/actions", () => ({
  deleteTagAction: vi.fn(),
  renameTagAction: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("FolderContentsView in ActiveWorkspace", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    localStorage.clear();
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
    }
  });

  const allFolders = [
    { id: "notes-root", name: "Notes", parentId: null, type: "NOTES_ROOT" },
    { id: "keep-root", name: "Quick Notes", parentId: null, type: "KEEP_ROOT" },
    { id: "chat-root", name: "Chat Channels", parentId: null, type: "CHAT_ROOT" },
    { id: "user-folder-1", name: "Personal Work", parentId: "notes-root", type: "GENERAL" },
    { id: "user-folder-2", name: "Sub-project", parentId: "user-folder-1", type: "GENERAL" },
    { id: "user-folder-3", name: "Other Notes", parentId: "notes-root", type: "GENERAL" },
  ];

  const allNotes = [
    { id: "note-1", title: "Personal Ideas", body: "Hello", folderId: null, updatedAt: new Date(), tags: [] },
    { id: "note-2", title: "Project Spec", body: "Work files", folderId: "user-folder-1", updatedAt: new Date(), tags: [] },
  ];

  const allMediaAssets = [
    { id: "media-1", filename: "pic.png", contentType: "image/png", sizeBytes: 1024, r2Key: "pic-key", folderId: null },
    { id: "media-2", filename: "audio.mp3", contentType: "audio/mpeg", sizeBytes: 2048, r2Key: "audio-key", folderId: "user-folder-1" },
  ];

  it("should render subfolders, notes, and files inside the selected folder", async () => {
    const selectedFolder = allFolders.find(f => f.id === "user-folder-1") || null;

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ActiveWorkspace
          selectedNote={null}
          selectedMedia={null}
          selectedFolder={selectedFolder}
          folderTrail={[selectedFolder!]}
          folderDestinations={[]}
          imageMediaAssets={[]}
          tags={[]}
          textPreviewContent=""
          hasVaultContent={true}
          browserTitle="Personal Work"
          allMediaAssets={allMediaAssets}
          allFolders={allFolders}
          allNotes={allNotes as Parameters<typeof ActiveWorkspace>[0]["allNotes"]}
        />
      );
    });

    const textContent = container.textContent || "";
    // Should render subfolder user-folder-2
    expect(textContent).toContain("Sub-project");
    // Should render note-2
    expect(textContent).toContain("Project Spec");
    // Should render media-2
    expect(textContent).toContain("audio.mp3");

    // Should NOT render root-level note-1 or media-1
    expect(textContent).not.toContain("Personal Ideas");
    expect(textContent).not.toContain("pic.png");

    root.unmount();
  });

  it("should navigate into a subfolder when clicked in FolderContentsView", async () => {
    const selectedFolder = allFolders.find(f => f.id === "user-folder-1") || null;

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ActiveWorkspace
          selectedNote={null}
          selectedMedia={null}
          selectedFolder={selectedFolder}
          folderTrail={[selectedFolder!]}
          folderDestinations={[]}
          imageMediaAssets={[]}
          tags={[]}
          textPreviewContent=""
          hasVaultContent={true}
          browserTitle="Personal Work"
          allMediaAssets={allMediaAssets}
          allFolders={allFolders}
          allNotes={allNotes as Parameters<typeof ActiveWorkspace>[0]["allNotes"]}
        />
      );
    });

    // Click the subfolder card/link
    const subfolderLink = Array.from(container.querySelectorAll("a, button")).find(
      (el) => el.textContent?.includes("Sub-project")
    ) as HTMLElement;

    expect(subfolderLink).not.toBeNull();
    await act(async () => {
      subfolderLink.click();
    });

    // Verify it updates URL to select the subfolder
    expect(mockPush).toHaveBeenCalledWith("/?folder=user-folder-2");

    root.unmount();
  });

  it("should support dragging cards and dropping them on subfolders, breadcrumbs, and empty grid background", async () => {
    const { moveNoteAction } = await import("@/app/notes/actions");
    const { moveMediaAssetAction } = await import("@/app/media/actions");
    const { moveFolderAction } = await import("@/app/folders/actions");

    const selectedFolder = allFolders.find(f => f.id === "user-folder-1") || null;

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ActiveWorkspace
          selectedNote={null}
          selectedMedia={null}
          selectedFolder={selectedFolder}
          folderTrail={[selectedFolder!]}
          folderDestinations={[]}
          imageMediaAssets={[]}
          tags={[]}
          textPreviewContent=""
          hasVaultContent={true}
          browserTitle="Personal Work"
          allMediaAssets={allMediaAssets}
          allFolders={allFolders}
          allNotes={allNotes as Parameters<typeof ActiveWorkspace>[0]["allNotes"]}
        />
      );
    });

    // 1. Verify cards are draggable
    const subfolderCard = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("Sub-project")
    ) as HTMLElement;
    const noteCard = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("Project Spec")
    ) as HTMLElement;
    const mediaCard = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("audio.mp3")
    ) as HTMLElement;

    expect(subfolderCard.getAttribute("draggable")).toBe("true");
    expect(noteCard.getAttribute("draggable")).toBe("true");
    expect(mediaCard.getAttribute("draggable")).toBe("true");

    // 2. Simulate dragging note-2 and dropping it on subfolder user-folder-2
    const dataTransferData: Record<string, string> = {};
    const mockDataTransfer = {
      setData: (key: string, val: string) => { dataTransferData[key] = val; },
      getData: (key: string) => dataTransferData[key] || "",
      effectAllowed: "none",
    } as unknown as DataTransfer;

    // Trigger dragstart on note
    const dragStartEvent = new Event("dragstart", { bubbles: true, cancelable: true }) as any;
    Object.defineProperty(dragStartEvent, "dataTransfer", { value: mockDataTransfer });
    noteCard.dispatchEvent(dragStartEvent);

    // Verify it set the correct data
    expect(dataTransferData["application/filebucket"]).toBe(JSON.stringify({ type: "note", id: "note-2" }));

    // Drop on subfolder card
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true }) as any;
    Object.defineProperty(dropEvent, "dataTransfer", { value: mockDataTransfer });
    subfolderCard.dispatchEvent(dropEvent);

    expect(moveNoteAction).toHaveBeenCalled();

    // 3. Simulate dropping media-2 on Vault breadcrumb link (moves to root)
    const mediaDataTransferData: Record<string, string> = {};
    const mediaDataTransfer = {
      setData: (key: string, val: string) => { mediaDataTransferData[key] = val; },
      getData: (key: string) => mediaDataTransferData[key] || "",
      effectAllowed: "none",
    } as unknown as DataTransfer;

    const mediaDragStartEvent = new Event("dragstart", { bubbles: true, cancelable: true }) as any;
    Object.defineProperty(mediaDragStartEvent, "dataTransfer", { value: mediaDataTransfer });
    mediaCard.dispatchEvent(mediaDragStartEvent);

    const vaultBreadcrumb = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.trim() === "Vault"
    ) as HTMLElement;

    const dropOnVaultEvent = new Event("drop", { bubbles: true, cancelable: true }) as any;
    Object.defineProperty(dropOnVaultEvent, "dataTransfer", { value: mediaDataTransfer });
    vaultBreadcrumb.dispatchEvent(dropOnVaultEvent);

    expect(moveMediaAssetAction).toHaveBeenCalled();

    // 4. Simulate dropping user-folder-3 onto background container (moves to user-folder-1)
    const folder3DataTransferData: Record<string, string> = {
      "application/filebucket": JSON.stringify({ type: "folder", id: "user-folder-3" })
    };
    const folder3DataTransfer = {
      getData: (key: string) => folder3DataTransferData[key] || "",
      effectAllowed: "none",
    } as unknown as DataTransfer;

    const backgroundContainer = container.querySelector(".flex-1.overflow-y-auto") as HTMLElement;
    const dropFolderOnBackgroundEvent = new Event("drop", { bubbles: true, cancelable: true }) as any;
    Object.defineProperty(dropFolderOnBackgroundEvent, "dataTransfer", { value: folder3DataTransfer });
    backgroundContainer.dispatchEvent(dropFolderOnBackgroundEvent);

    expect(moveFolderAction).toHaveBeenCalled();

    root.unmount();
  });

  it("should support dropping onto the background grid container to move item to currently open folder", async () => {
    const { moveNoteAction } = await import("@/app/notes/actions");

    const selectedFolder = allFolders.find(f => f.id === "user-folder-2") || null; // Sub-project (currently empty)

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ActiveWorkspace
          selectedNote={null}
          selectedMedia={null}
          selectedFolder={selectedFolder}
          folderTrail={[allFolders[0], selectedFolder!]}
          folderDestinations={[]}
          imageMediaAssets={[]}
          tags={[]}
          textPreviewContent=""
          hasVaultContent={true}
          browserTitle="Sub-project"
          allMediaAssets={allMediaAssets}
          allFolders={allFolders}
          allNotes={allNotes as Parameters<typeof ActiveWorkspace>[0]["allNotes"]}
        />
      );
    });

    const backgroundContainer = container.querySelector(".flex-1.overflow-y-auto") as HTMLElement;
    expect(backgroundContainer).not.toBeNull();

    const noteDataTransferData: Record<string, string> = {
      "application/filebucket": JSON.stringify({ type: "note", id: "note-1" }) // note-1 is currently at root (folderId: null)
    };
    const noteDataTransfer = {
      getData: (key: string) => noteDataTransferData[key] || "",
      effectAllowed: "none",
    } as unknown as DataTransfer;

    const dropEvent = new Event("drop", { bubbles: true, cancelable: true }) as any;
    Object.defineProperty(dropEvent, "dataTransfer", { value: noteDataTransfer });
    backgroundContainer.dispatchEvent(dropEvent);

    expect(moveNoteAction).toHaveBeenCalled();

    root.unmount();
  });
});

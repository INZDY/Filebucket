import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ActiveWorkspace } from "@/app/vault/active-workspace";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    return (
      <a
        href={href}
        onClick={(e) => {
          if (onClick) onClick(e);
          if (!e.defaultPrevented) {
            e.preventDefault();
            mockPush(href || "");
          }
        }}
        {...props}
      >
        {children}
      </a>
    );
  },
}));

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
  trashMediaAssetAction: vi.fn(),
}));
vi.mock("@/app/bulk/actions", () => ({
  bulkMoveItemsAction: vi.fn(),
  bulkTrashItemsAction: vi.fn(),
}));
vi.mock("@/app/tags/actions", () => ({
  deleteTagAction: vi.fn(),
  renameTagAction: vi.fn(),
}));

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

function renderWorkspace(root: ReturnType<typeof createRoot>, selectedFolderId: string) {
  const allFolders = [
    { id: "notes-root", name: "Notes", parentId: null, type: "NOTES_ROOT" },
    { id: "keep-root", name: "Quick Notes", parentId: null, type: "KEEP_ROOT" },
    { id: "chat-root", name: "Chat Channels", parentId: null, type: "CHAT_ROOT" },
    { id: "folder-a", name: "Personal Work", parentId: null, type: "GENERAL" },
    { id: "folder-b", name: "Sub-project", parentId: "folder-a", type: "GENERAL" },
    { id: "folder-c", name: "Other", parentId: null, type: "GENERAL" },
  ];
  const allNotes = [
    { id: "note-1", title: "Root note", body: "x", folderId: null, updatedAt: new Date(), tags: [] },
  ];
  const allMediaAssets = [
    { id: "media-1", filename: "pic.png", contentType: "image/png", sizeBytes: 1024, r2Key: "pic-key", folderId: "folder-a" },
    { id: "media-2", filename: "audio.mp3", contentType: "audio/mpeg", sizeBytes: 2048, r2Key: "audio-key", folderId: "folder-a" },
  ];
  const selectedFolder = allFolders.find((f) => f.id === selectedFolderId) || null;

  return act(async () => {
    root.render(
      <ActiveWorkspace
        selectedNote={null}
        selectedMedia={null}
        selectedFolder={selectedFolder}
        folderTrail={selectedFolder ? [selectedFolder] : []}
        folderDestinations={[]}
        imageMediaAssets={[]}
        tags={[]}
        textPreviewContent=""
        hasVaultContent={true}
        browserTitle={selectedFolder?.name ?? "Vault"}
        allMediaAssets={allMediaAssets}
        allFolders={allFolders}
        allNotes={allNotes as Parameters<typeof ActiveWorkspace>[0]["allNotes"]}
      />
    );
  });
}

describe("Bulk Selection UI in ActiveWorkspace", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  afterEach(() => {
    if (container) {
      root.unmount();
      document.body.removeChild(container);
    }
  });

  it("should render a Select toggle and enter selection mode with a Cancel toggle", async () => {
    await renderWorkspace(root, "folder-a");

    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select"
    ) as HTMLElement;
    expect(selectButton).not.toBeNull();

    await act(async () => {
      selectButton.click();
    });

    const cancelButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Cancel"
    ) as HTMLElement;
    expect(cancelButton).not.toBeNull();
  });

  it("should toggle a folder card membership instead of navigating while in selection mode", async () => {
    const { bulkTrashItemsAction } = await import("@/app/bulk/actions");
    vi.mocked(bulkTrashItemsAction).mockResolvedValue({ failures: [] });

    await renderWorkspace(root, "folder-a");

    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select"
    ) as HTMLElement;
    await act(async () => {
      selectButton.click();
    });

    const subfolderLink = container.querySelector("a[href='/?folder=folder-b']") as HTMLElement;
    expect(subfolderLink).not.toBeNull();
    await act(async () => {
      subfolderLink.click();
    });

    expect(mockPush).not.toHaveBeenCalledWith("/?folder=folder-b");
    expect(container.textContent).toContain("1 selected");
    expect(container.querySelector('[data-selected="true"]')).not.toBeNull();
  });

  it("should toggle a media card and suppress its overflow menu while in selection mode", async () => {
    await renderWorkspace(root, "folder-a");

    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select"
    ) as HTMLElement;
    await act(async () => {
      selectButton.click();
    });

    const mediaLink = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("audio.mp3")
    ) as HTMLElement;
    expect(mediaLink).not.toBeNull();
    await act(async () => {
      mediaLink.click();
    });

    expect(container.textContent).toContain("1 selected");
    const overflowMenu = Array.from(container.querySelectorAll("button")).find(
      (el) => el.getAttribute("aria-label") === "Media actions for audio.mp3"
    );
    expect(overflowMenu).toBeUndefined();
    expect(container.querySelector('[data-selected="true"]')).not.toBeNull();
  });

  it("should select all items in the current folder", async () => {
    await renderWorkspace(root, "folder-a");

    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select"
    ) as HTMLElement;
    await act(async () => {
      selectButton.click();
    });

    const selectAllButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select all"
    ) as HTMLElement;
    await act(async () => {
      selectAllButton.click();
    });

    // folder-b + pic.png + audio.mp3
    expect(container.textContent).toContain("3 selected");
  });

  it("should link Download ZIP to /api/export with the selected ids", async () => {
    await renderWorkspace(root, "folder-a");

    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select"
    ) as HTMLElement;
    await act(async () => {
      selectButton.click();
    });

    const subfolderLink = container.querySelector("a[href='/?folder=folder-b']") as HTMLElement;
    await act(async () => {
      subfolderLink.click();
    });

    const downloadAnchor = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("Download ZIP")
    ) as HTMLElement;
    expect(downloadAnchor).not.toBeNull();
    expect(downloadAnchor.getAttribute("href")).toBe("/api/export?ids=folder%3Afolder-b");
  });

  it("should run bulk move with the selected items and clear the selection", async () => {
    const { bulkMoveItemsAction } = await import("@/app/bulk/actions");
    vi.mocked(bulkMoveItemsAction).mockResolvedValue({ failures: [] });

    await renderWorkspace(root, "folder-a");

    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select"
    ) as HTMLElement;
    await act(async () => {
      selectButton.click();
    });

    const subfolderLink = container.querySelector("a[href='/?folder=folder-b']") as HTMLElement;
    await act(async () => {
      subfolderLink.click();
    });

    const moveButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Move"
    ) as HTMLElement;
    await act(async () => {
      moveButton.click();
    });

    const moveForm = container.querySelector('form[name="bulk-move"]') as HTMLFormElement;
    expect(moveForm).not.toBeNull();
    await act(async () => {
      moveForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(bulkMoveItemsAction).toHaveBeenCalledWith([{ type: "folder", id: "folder-b" }], null);
    expect(mockRefresh).toHaveBeenCalled();
    expect(container.textContent).not.toContain("selected");
  });

  it("should run bulk trash with the selected items and clear the selection", async () => {
    const { bulkTrashItemsAction } = await import("@/app/bulk/actions");
    vi.mocked(bulkTrashItemsAction).mockResolvedValue({ failures: [] });

    await renderWorkspace(root, "folder-a");

    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select"
    ) as HTMLElement;
    await act(async () => {
      selectButton.click();
    });

    const mediaLink = Array.from(container.querySelectorAll("a")).find(
      (el) => el.textContent?.includes("audio.mp3")
    ) as HTMLElement;
    await act(async () => {
      mediaLink.click();
    });

    const trashButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Move to Trash"
    ) as HTMLElement;
    await act(async () => {
      trashButton.click();
    });

    expect(bulkTrashItemsAction).toHaveBeenCalledWith([{ type: "media", id: "media-2" }]);
    expect(mockRefresh).toHaveBeenCalled();
    expect(container.textContent).not.toContain("selected");
  });

  it("should exit selection mode when navigating to another folder", async () => {
    await renderWorkspace(root, "folder-a");

    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Select"
    ) as HTMLElement;
    await act(async () => {
      selectButton.click();
    });
    expect(container.textContent).toContain("Cancel");

    await renderWorkspace(root, "folder-c");

    expect(container.textContent).toContain("Select");
    expect(container.textContent).not.toContain("Cancel");
  });
});
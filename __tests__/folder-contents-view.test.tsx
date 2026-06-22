import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ActiveWorkspace } from "@/app/vault/active-workspace";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
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
    { id: "user-folder-1", name: "Personal Work", parentId: null, type: "GENERAL" },
    { id: "user-folder-2", name: "Sub-project", parentId: "user-folder-1", type: "GENERAL" },
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
});

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", {
  value: ResizeObserverMock,
});
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserverMock,
});

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
});
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    return (
      <a href={href} onClick={onClick} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock action modules
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
vi.mock("@/app/tags/actions", () => ({
  deleteTagAction: vi.fn(),
  renameTagAction: vi.fn(),
}));

import { VaultDashboard } from "@/app/vault/vault-dashboard";

describe("Dashboard Prop-to-State Sync (TDD)", () => {
  it("should synchronize state with new initialFolders, initialNotes, and initialMediaAssets props upon updates", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const initialFolders1 = [
      { id: "f1", name: "Folder One", parentId: null, type: "GENERAL" }
    ];
    const initialNotes1 = [
      { id: "n1", title: "Note One", body: "", userId: "user-123", folderId: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), color: null, isPinned: false, tags: [] }
    ];
    const initialMedia1 = [
      { id: "m1", userId: "user-123", noteId: null, folderId: null, r2Key: "key-1", filename: "Media One.png", contentType: "image/png", sizeBytes: 100, width: null, height: null, chatMessageId: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
    ];

    // Initial render
    await act(async () => {
      root.render(
        <VaultDashboard
          userId="user-123"
          initialFolders={initialFolders1}
          initialNotes={initialNotes1}
          initialMediaAssets={initialMedia1}
          initialTags={[]}
          initialDeletedFolders={[]}
          initialDeletedNotes={[]}
          initialDeletedMediaAssets={[]}
          initialSearchParams={null}
        />
      );
    });

    expect(container.textContent).toContain("Folder One");
    expect(container.textContent).toContain("Note One");

    const initialFolders2 = [
      { id: "f2", name: "Folder Two", parentId: null, type: "GENERAL" }
    ];
    const initialNotes2 = [
      { id: "n2", title: "Note Two", body: "", userId: "user-123", folderId: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), color: null, isPinned: false, tags: [] }
    ];
    const initialMedia2 = [
      { id: "m2", userId: "user-123", noteId: null, folderId: null, r2Key: "key-2", filename: "Media Two.png", contentType: "image/png", sizeBytes: 200, width: null, height: null, chatMessageId: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
    ];

    // Re-render with new props
    await act(async () => {
      root.render(
        <VaultDashboard
          userId="user-123"
          initialFolders={initialFolders2}
          initialNotes={initialNotes2}
          initialMediaAssets={initialMedia2}
          initialTags={[]}
          initialDeletedFolders={[]}
          initialDeletedNotes={[]}
          initialDeletedMediaAssets={[]}
          initialSearchParams={null}
        />
      );
    });

    // The component state should update, showing the new folders and notes
    expect(container.textContent).toContain("Folder Two");
    expect(container.textContent).toContain("Note Two");
    expect(container.textContent).not.toContain("Folder One");
    expect(container.textContent).not.toContain("Note One");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

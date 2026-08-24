import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock actions before importing components
vi.mock("@/app/notes/actions", () => ({
  createNoteAction: vi.fn(),
  importMarkdownNotesAction: vi.fn(),
  restoreNoteAction: vi.fn(),
  deleteNoteAction: vi.fn(),
  moveNoteAction: vi.fn(),
  trashNoteAction: vi.fn(),
}));
vi.mock("@/app/media/actions", () => ({
  restoreMediaAssetAction: vi.fn(),
  deleteMediaAssetAction: vi.fn(),
  moveMediaAssetAction: vi.fn(),
  trashMediaAssetAction: vi.fn(),
}));

import { MediaActionsMenu } from "@/app/media/media-actions-menu";
import { NoteActionsMenu } from "@/app/notes/note-actions-menu";
import { ActivityBar } from "@/components/activity-bar";
import { BookReader } from "@/components/book-reader";

// Mock epubjs
vi.mock("epubjs", () => {
  const mockRendition = {
    display: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    flow: vi.fn(),
    themes: {
      register: vi.fn(),
      select: vi.fn(),
      fontSize: vi.fn(),
    },
    next: vi.fn().mockResolvedValue(undefined),
    prev: vi.fn().mockResolvedValue(undefined),
  };
  const mockBook = {
    renderTo: vi.fn(() => mockRendition),
    ready: Promise.resolve(),
    locations: {
      generate: vi.fn().mockResolvedValue([]),
      percentageFromCfi: vi.fn().mockReturnValue(0.5),
    },
    navigation: {
      toc: [],
    },
  };
  const mockEpub = vi.fn(() => mockBook);
  return {
    default: mockEpub,
  };
});

describe("Milestone 58 - Simultaneous 3-Dot Menus Coordination", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should close MediaActionsMenu when close-actions-menus event fires with a different ID", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const mediaAsset = { id: "media-1", filename: "test.png", folderId: null };
    const destinations = [{ id: "f1", name: "Folder 1" }];

    await act(async () => {
      root.render(<MediaActionsMenu mediaAsset={mediaAsset} destinations={destinations} />);
    });

    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    if (btn) {
      await act(async () => {
        btn.click();
      });
    }

    let menuOverlay = document.body.querySelector("form, div.fixed");
    expect(menuOverlay).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new CustomEvent("close-actions-menus", { detail: { exceptId: "different-id" } }));
    });

    menuOverlay = document.body.querySelector("form, div.fixed");
    expect(menuOverlay).toBeNull();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should keep MediaActionsMenu open when close-actions-menus event fires with its own ID", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const mediaAsset = { id: "media-2", filename: "test.png", folderId: null };
    const destinations = [{ id: "f1", name: "Folder 1" }];

    await act(async () => {
      root.render(<MediaActionsMenu mediaAsset={mediaAsset} destinations={destinations} />);
    });

    const btn = container.querySelector("button");
    if (btn) {
      await act(async () => {
        btn.click();
      });
    }

    let menuOverlay = document.body.querySelector("form, div.fixed");
    expect(menuOverlay).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new CustomEvent("close-actions-menus", { detail: { exceptId: "media-2" } }));
    });

    menuOverlay = document.body.querySelector("form, div.fixed");
    expect(menuOverlay).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

describe("Milestone 58 - Compact Mobile Navigation", () => {
  it("should render ActivityBar with a container class height of h-12 on mobile viewports", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ActivityBar
          activeMode="FILES"
          notesRootId="notes-root"
          keepRootId="keep-root"
          chatRootId="chat-root"
        />
      );
    });

    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    if (nav) {
      const className = nav.className;
      expect(className).toContain("h-12");
      expect(className).not.toContain("h-16");
    }

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

describe("Milestone 58 - Compact BookReader Settings", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should toggle settings dropdown pane when settings button is clicked", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BookReader
          isOpen={true}
          onClose={vi.fn()}
          title="EPUB Test"
          url="http://localhost/test.epub"
          contentType="application/epub+zip"
          mediaId="media-1"
        />
      );
    });

    const settingsBtn = document.body.querySelector("[data-testid='settings-toggle']");
    expect(settingsBtn).not.toBeNull();

    let dropdown = document.body.querySelector("[data-testid='settings-dropdown']");
    expect(dropdown).toBeNull();

    if (settingsBtn) {
      await act(async () => {
        settingsBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    }

    dropdown = document.body.querySelector("[data-testid='settings-dropdown']");
    expect(dropdown).not.toBeNull();

    // Wait for the component to register the document listener (due to setTimeout)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Click outside to close
    await act(async () => {
      document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Wait a brief timeout for react state to update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    dropdown = document.body.querySelector("[data-testid='settings-dropdown']");
    expect(dropdown).toBeNull();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

import { describe, it, expect, vi } from "vitest";
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
vi.mock("@/app/bulk/actions", () => ({
  bulkMoveItemsAction: vi.fn(),
  bulkTrashItemsAction: vi.fn(),
}));
vi.mock("@/app/tags/actions", () => ({
  deleteTagAction: vi.fn(),
  renameTagAction: vi.fn(),
}));

import { ActiveWorkspace } from "@/app/vault/active-workspace";
import { SettingsProvider } from "@/components/settings-context";

describe("Folder Contents View Thumbnails & Card File Operations (TDD)", () => {
  it("should render image thumbnails with aspect-video preview frame and 3-dots actions menu", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const sampleMedia = [
      {
        id: "media_img_1",
        filename: "test_photo.jpg",
        contentType: "image/jpeg",
        sizeBytes: 102400,
        r2Key: "media/test_photo.jpg",
        folderId: "f1",
      },
    ];

    const sampleFolder = {
      id: "f1",
      name: "Photos",
      parentId: null,
    };

    await act(async () => {
      root.render(
        <ActiveWorkspace
          selectedNote={null}
          selectedMedia={null}
          selectedFolder={sampleFolder}
          folderTrail={[sampleFolder]}
          folderDestinations={[]}
          imageMediaAssets={[]}
          tags={[]}
          textPreviewContent=""
          hasVaultContent={true}
          browserTitle="Photos"
          allMediaAssets={sampleMedia}
          allFolders={[sampleFolder]}
          allNotes={[]}
        />
      );
    });

    // Verify img thumbnail element is rendered in card
    const img = container.querySelector("img[src*='test_photo.jpg']");
    expect(img).toBeDefined();
    expect(img).not.toBeNull();

    // Verify 3-dots actions menu button exists on card
    const actionsBtn = container.querySelector("[aria-label*='Actions for']");
    expect(actionsBtn).toBeDefined();
    expect(actionsBtn).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should handle undefined or null contentType in media files gracefully and not crash", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const sampleMedia = [
      {
        id: "media_unsupported",
        filename: "test_file.xyz",
        contentType: undefined as any,
        sizeBytes: 500,
        r2Key: "media/test_file.xyz",
        folderId: "f1",
      },
    ];

    const sampleFolder = {
      id: "f1",
      name: "Files",
      parentId: null,
    };

    // Rendering should not throw/crash even when contentType is undefined
    await act(async () => {
      root.render(
        <ActiveWorkspace
          selectedNote={null}
          selectedMedia={null}
          selectedFolder={sampleFolder}
          folderTrail={[sampleFolder]}
          folderDestinations={[]}
          imageMediaAssets={[]}
          tags={[]}
          textPreviewContent=""
          hasVaultContent={true}
          browserTitle="Files"
          allMediaAssets={sampleMedia}
          allFolders={[sampleFolder]}
          allNotes={[]}
        />
      );
    });

    // Check that it rendered and falls back to standard file display
    const label = container.textContent;
    expect(label).toContain("test_file.xyz");
    expect(label).toContain("File"); // fallback category

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should render cover thumbnail with uniform aspect-video frame using object-contain and custom TXT preview card styling", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const sampleMedia = [
      {
        id: "epub_book_1",
        filename: "test_book.epub",
        contentType: "application/epub+zip",
        sizeBytes: 204800,
        r2Key: "media/test_book.epub",
        thumbnailKey: "media/test_book.epub_thumbnail.png",
        folderId: "f1",
      },
      {
        id: "text_doc_1",
        filename: "notes.txt",
        contentType: "text/plain",
        sizeBytes: 1024,
        r2Key: "media/notes.txt",
        folderId: "f1",
      }
    ];

    const sampleFolder = {
      id: "f1",
      name: "Library",
      parentId: null,
    };

    await act(async () => {
      root.render(
        <ActiveWorkspace
          selectedNote={null}
          selectedMedia={null}
          selectedFolder={sampleFolder}
          folderTrail={[sampleFolder]}
          folderDestinations={[]}
          imageMediaAssets={[]}
          tags={[]}
          textPreviewContent=""
          hasVaultContent={true}
          browserTitle="Library"
          allMediaAssets={sampleMedia}
          allFolders={[sampleFolder]}
          allNotes={[]}
        />
      );
    });

    // 1. Verify EPUB cover thumbnail renders and is center-fitted using object-contain
    const thumbImg = container.querySelector("img[src*='test_book.epub_thumbnail.png']") as HTMLImageElement | null;
    expect(thumbImg).toBeDefined();
    expect(thumbImg).not.toBeNull();
    expect(thumbImg?.className).toContain("object-contain");

    // 2. Verify book card container matches uniform aspect-video instead of stretching to vertical aspect-[3/4]
    const aspectContainer = container.querySelector(".aspect-video");
    expect(aspectContainer).toBeDefined();
    expect(aspectContainer).not.toBeNull();

    // 3. Verify text card custom layout renders (with TXT tag)
    const textLabel = container.textContent;
    expect(textLabel).toContain("TXT");
    expect(textLabel).toContain("notes.txt");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should render Obsidian Notes inside Files mode as stylized purple card previews with text body snippets", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const sampleFolder = {
      id: "f1",
      name: "Library",
      parentId: null,
    };

    const sampleNotes = [
      {
        id: "note_1",
        title: "Grocery List",
        body: "- [ ] Buy fresh milk\n- [ ] Buy organic eggs\n- [ ] Whole wheat bread",
        folderId: "f1",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    await act(async () => {
      root.render(
        <ActiveWorkspace
          selectedNote={null}
          selectedMedia={null}
          selectedFolder={sampleFolder}
          folderTrail={[sampleFolder]}
          folderDestinations={[]}
          imageMediaAssets={[]}
          tags={[]}
          textPreviewContent=""
          hasVaultContent={true}
          browserTitle="Library"
          allMediaAssets={[]}
          allFolders={[sampleFolder]}
          allNotes={sampleNotes}
        />
      );
    });

    // Verify Obsidian note custom card elements exist
    const textContent = container.textContent;
    expect(textContent).toContain("Grocery List");
    expect(textContent).toContain("MD");
    // Verify stripped body markdown snippet is rendered on the note card
    expect(textContent).toContain("Buy fresh milk Buy organic eggs Whole wheat bread");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should render cards with configurable aspect ratio settings (PORTRAIT) and render longer snippets with more mock lines", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const sampleMedia = [
      {
        id: "text_doc_1",
        filename: "notes.txt",
        contentType: "text/plain",
        sizeBytes: 1024,
        r2Key: "media/notes.txt",
        folderId: "f1",
      }
    ];

    const sampleFolder = {
      id: "f1",
      name: "Library",
      parentId: null,
    };

    const sampleNotes = [
      {
        id: "note_1",
        title: "Grocery List",
        body: "Line 1 text body\nLine 2 text body\nLine 3 text body\nLine 4 text body\nLine 5 text body\nLine 6 text body\nLine 7 text body\nLine 8 text body",
        folderId: "f1",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    const mockSettings = {
      quotaLimit: 10 * 1024 * 1024 * 1024,
      autosaveDelay: 1500,
      defaultNoteFont: "sans" as const,
      fileCardAspect: "PORTRAIT" as const,
    };

    await act(async () => {
      root.render(
        <SettingsProvider initialSettings={mockSettings}>
          <ActiveWorkspace
            selectedNote={null}
            selectedMedia={null}
            selectedFolder={sampleFolder}
            folderTrail={[sampleFolder]}
            folderDestinations={[]}
            imageMediaAssets={[]}
            tags={[]}
            textPreviewContent=""
            hasVaultContent={true}
            browserTitle="Library"
            allMediaAssets={sampleMedia}
            allFolders={[sampleFolder]}
            allNotes={sampleNotes}
          />
        </SettingsProvider>
      );
    });

    // 1. Verify portrait aspect ratio class is applied on card layout frame containers
    const aspectContainer = container.querySelector(".aspect-\\[3\\/4\\]");
    expect(aspectContainer).not.toBeNull();

    // 2. Verify note card uses longer line clamping height styling
    const clampedParagraph = container.querySelector(".line-clamp-6");
    expect(clampedParagraph).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});


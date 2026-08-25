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
vi.mock("@/app/tags/actions", () => ({
  deleteTagAction: vi.fn(),
  renameTagAction: vi.fn(),
}));

import { ActiveWorkspace } from "@/app/vault/active-workspace";

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
    const actionsBtn = container.querySelector("[aria-label*='Media actions']");
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

  it("should render cover thumbnail with aspect-[3/4] for book/manga and custom TXT preview card styling", async () => {
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

    // 1. Verify EPUB cover thumbnail renders
    const thumbImg = container.querySelector("img[src*='test_book.epub_thumbnail.png']");
    expect(thumbImg).toBeDefined();
    expect(thumbImg).not.toBeNull();

    // 2. Verify book aspect ratio [3/4] container exists
    const aspectContainer = container.querySelector(".aspect-\\[3\\/4\\]");
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
});


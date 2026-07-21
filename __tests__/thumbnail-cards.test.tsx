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
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { FilebucketPlayer } from "@/components/filebucket-player";
import { ActiveWorkspace } from "@/app/vault/active-workspace";

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

// Mock video.js
vi.mock("video.js", () => {
  const mockPlayer = {
    src: vi.fn(),
    dispose: vi.fn(),
    isDisposed: vi.fn(() => false),
  };
  const mockVideojs = vi.fn(() => mockPlayer);
  return {
    default: mockVideojs,
  };
});

describe("FilebucketPlayer Component (Milestone 53)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render a video element when isVideo is true", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FilebucketPlayer
          src="http://localhost/test.mp4"
          type="video/mp4"
          isVideo={true}
        />
      );
    });

    const videoEl = container.querySelector("video");
    expect(videoEl).not.toBeNull();
    expect(videoEl?.className).toContain("video-js");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should render an audio element when isVideo is false", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FilebucketPlayer
          src="http://localhost/test.mp3"
          type="audio/mpeg"
          isVideo={false}
        />
      );
    });

    const audioEl = container.querySelector("audio");
    expect(audioEl).not.toBeNull();
    expect(audioEl?.className).toContain("video-js");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  describe("ActiveWorkspace Integration", () => {
    it("should render FilebucketPlayer in ActiveWorkspace for video preview", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      const videoMedia = {
        id: "media-video-1",
        filename: "my-movie.mp4",
        contentType: "video/mp4",
        sizeBytes: 999999,
        r2Key: "media/my-movie.mp4",
        folderId: null,
      };

      await act(async () => {
        root.render(
          <ActiveWorkspace
            selectedNote={null}
            selectedMedia={videoMedia}
            selectedFolder={null}
            folderTrail={[]}
            folderDestinations={[]}
            imageMediaAssets={[]}
            tags={[]}
            textPreviewContent=""
            hasVaultContent={true}
            browserTitle="Vault"
            allMediaAssets={[videoMedia]}
            allFolders={[]}
            allNotes={[]}
          />
        );
      });

      // Verification: video element with video-js class is rendered for video preview
      const videoEl = container.querySelector("video.video-js");
      expect(videoEl).not.toBeNull();

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it("should render FilebucketPlayer in ActiveWorkspace for audio preview", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      const audioMedia = {
        id: "media-audio-1",
        filename: "my-song.mp3",
        contentType: "audio/mpeg",
        sizeBytes: 555555,
        r2Key: "media/my-song.mp3",
        folderId: null,
      };

      await act(async () => {
        root.render(
          <ActiveWorkspace
            selectedNote={null}
            selectedMedia={audioMedia}
            selectedFolder={null}
            folderTrail={[]}
            folderDestinations={[]}
            imageMediaAssets={[]}
            tags={[]}
            textPreviewContent=""
            hasVaultContent={true}
            browserTitle="Vault"
            allMediaAssets={[audioMedia]}
            allFolders={[]}
            allNotes={[]}
          />
        );
      });

      // Verification: audio element with video-js class is rendered for audio preview
      const audioEl = container.querySelector("audio.video-js");
      expect(audioEl).not.toBeNull();

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });
});

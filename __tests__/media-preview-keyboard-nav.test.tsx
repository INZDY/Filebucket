import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MediaPreview } from "@/app/vault/media-preview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    return (
      <a href={href} onClick={onClick} {...props}>
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

describe("MediaPreview keyboard navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  const folder = { id: "folder-1", name: "Shots" };
  const media = [
    {
      id: "media-1",
      filename: "a.png",
      contentType: "image/png",
      sizeBytes: 100,
      r2Key: "media/a.png",
      folderId: folder.id,
    },
    {
      id: "media-2",
      filename: "b.png",
      contentType: "image/png",
      sizeBytes: 200,
      r2Key: "media/b.png",
      folderId: folder.id,
    },
    {
      id: "media-3",
      filename: "c.png",
      contentType: "image/png",
      sizeBytes: 300,
      r2Key: "media/c.png",
      folderId: folder.id,
    },
  ];
  const selected = { ...media[1], folder };

  async function mountPreview() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const navigated = vi.fn();
    window.addEventListener("vault-navigate", navigated);

    await act(async () => {
      root.render(
        <MediaPreview
          selectedMedia={selected}
          folderTrail={[folder]}
          folderDestinations={[]}
          allMediaAssets={media}
        />
      );
    });

    return {
      root,
      container,
      navigated,
      async unmount() {
        window.removeEventListener("vault-navigate", navigated);
        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      },
    };
  }

  function pressKey(target: EventTarget, key: string) {
    return act(async () => {
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    });
  }

  it("navigates to the previous and next sibling media with the arrow keys", async () => {
    const { navigated, unmount } = await mountPreview();

    await pressKey(window, "ArrowRight");
    expect(navigated).toHaveBeenCalledTimes(1);
    expect(navigated.mock.calls[0][0].detail).toEqual({ url: "/?folder=folder-1&media=media-3" });

    await pressKey(window, "ArrowLeft");
    expect(navigated).toHaveBeenCalledTimes(2);
    expect(navigated.mock.calls[1][0].detail).toEqual({ url: "/?folder=folder-1&media=media-1" });

    await unmount();
  });

  it.each(["input", "textarea", "select", "contenteditable"])(
    "does not navigate while focus sits in a %s",
    async (kind) => {
      const { navigated, unmount } = await mountPreview();

      const target =
        kind === "contenteditable"
          ? document.createElement("div")
          : document.createElement(kind as "input");
      if (kind === "contenteditable") {
        target.setAttribute("contenteditable", "true");
      }
      document.body.appendChild(target);
      target.focus();
      expect(document.activeElement).toBe(target);

      await pressKey(target, "ArrowRight");
      await pressKey(target, "ArrowLeft");

      expect(navigated).not.toHaveBeenCalled();

      await unmount();
    }
  );
});

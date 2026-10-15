import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { FolderCard } from "@/app/vault/folder-card";
import { MediaCard } from "@/app/vault/media-card";
import { NoteCard, getNoteSnippet } from "@/app/vault/note-card";
import { getMediaPreviewKind } from "@/app/vault/media-kind";
import type { ItemActions } from "@/app/vault/vault-entries";

// Card modules are presentation-only: they must render without a router or any
// server-action mock. Only next/link is stubbed, to keep the DOM a plain anchor.
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function spyActions(): ItemActions & { onMove: ReturnType<typeof vi.fn>; onRename: ReturnType<typeof vi.fn>; onTrash: ReturnType<typeof vi.fn> } {
  return { onMove: vi.fn(), onRename: vi.fn(), onTrash: vi.fn() };
}

describe("vault cards", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("FolderCard links into the folder and shows its item count", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FolderCard
          actions={spyActions()}
          destinations={[]}
          drag={{ draggable: true }}
          folder={{ id: "folder-a", name: "Projects", parentId: null, type: "GENERAL" }}
          isDragOver={false}
          itemCount={7}
          onToggleSelect={vi.fn()}
          selected={false}
          selectionMode={false}
        />
      );
    });

    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/?folder=folder-a");
    expect(container.textContent).toContain("Projects");
    expect(container.textContent).toContain("(7)");
    // Not in selection mode: the card stays navigable.
    expect(container.querySelector("[data-bulk-item]")?.tagName).toBe("A");

    root.unmount();
  });

  it("FolderCard becomes a toggle in selection mode and reports membership", async () => {
    const onToggleSelect = vi.fn();
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FolderCard
          actions={spyActions()}
          destinations={[]}
          drag={{ draggable: true }}
          folder={{ id: "folder-a", name: "Projects", parentId: null, type: "GENERAL" }}
          isDragOver={false}
          itemCount={0}
          onToggleSelect={onToggleSelect}
          selected={true}
          selectionMode={true}
        />
      );
    });

    const card = container.querySelector('[data-bulk-item="folder"]') as HTMLElement;
    expect(card.tagName).toBe("DIV");
    expect(card.querySelector("a")).toBeNull();
    expect(card.getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      card.click();
    });
    expect(onToggleSelect).toHaveBeenCalledTimes(1);

    root.unmount();
  });

  it("NoteCard renders its title and a portrait-sized snippet", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <NoteCard
          actions={spyActions()}
          aspect="PORTRAIT"
          destinations={[]}
          drag={{ draggable: true }}
          note={{
            id: "note-1",
            title: "Trip Plan",
            body: "# Heading\n\n- [ ] Book flights\n- [x] Pack",
            updatedAt: new Date(),
            folderId: "folder-a",
            tags: [],
          }}
        />
      );
    });

    expect(container.textContent).toContain("Trip Plan");
    expect(container.textContent).toContain("Book flights");
    expect(container.querySelector(".aspect-\\[3\\/4\\]")).not.toBeNull();
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/?folder=folder-a&note=note-1");

    root.unmount();
  });

  it("MediaCard prefers the stored thumbnail and labels the kind", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <MediaCard
          actions={spyActions()}
          aspect="VIDEO"
          destinations={[]}
          drag={{ draggable: true }}
          media={{
            id: "media-1",
            filename: "cover.epub",
            contentType: "application/epub+zip",
            r2Key: "media/cover.epub",
            thumbnailKey: "thumbs/cover.jpg",
            folderId: null,
          }}
          onToggleSelect={vi.fn()}
          selected={false}
          selectionMode={false}
        />
      );
    });

    expect(container.querySelector("img[src*='cover.jpg']")).not.toBeNull();
    expect(container.textContent).toContain("cover.epub");
    expect(container.textContent).toContain("EPUB");

    root.unmount();
  });

  it("MediaCard suppresses its overflow menu in selection mode", async () => {
    const onToggleSelect = vi.fn();
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <MediaCard
          actions={spyActions()}
          aspect="VIDEO"
          destinations={[]}
          drag={{ draggable: true }}
          media={{
            id: "media-1",
            filename: "pic.png",
            contentType: "image/png",
            r2Key: "media/pic.png",
            folderId: null,
          }}
          onToggleSelect={onToggleSelect}
          selected={false}
          selectionMode={true}
        />
      );
    });

    expect(container.querySelector("[aria-label*='Actions for']")).toBeNull();

    const card = container.querySelector('[data-bulk-item="media"]') as HTMLElement;
    await act(async () => {
      card.click();
    });
    expect(onToggleSelect).toHaveBeenCalledTimes(1);

    root.unmount();
  });
});

describe("getNoteSnippet", () => {
  it("strips markdown markers and ellipsizes past the limit", () => {
    expect(getNoteSnippet("# Title\n\n- [ ] Task")).toBe("Title Task");
    expect(getNoteSnippet("x".repeat(20), 10)).toBe("xxxxxxxxxx...");
    expect(getNoteSnippet("")).toBe("");
  });
});

describe("getMediaPreviewKind", () => {
  it("falls back to the filename for books and archives", () => {
    expect(getMediaPreviewKind(null, "book.epub")).toBe("epub");
    expect(getMediaPreviewKind(null, "pages.cbz")).toBe("archive");
    expect(getMediaPreviewKind("image/png", "pic.png")).toBe("image");
    expect(getMediaPreviewKind(null, "mystery")).toBe("unsupported");
  });
});

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { KeepWorkspace } from "@/app/vault/keep-workspace";

vi.mock("@/app/notes/actions", () => ({
  createKeepNoteAction: vi.fn(),
  updateKeepNoteAction: vi.fn(),
  trashKeepNoteAction: vi.fn(),
}));

vi.mock("@/app/tags/actions", () => ({
  toggleNoteTagAction: vi.fn(),
  createTagAction: vi.fn(),
}));

describe("KeepWorkspace UI Component", () => {
  const mockNotes = [
    {
      id: "note-1",
      title: "Note 1",
      body: "Body 1",
      color: "red",
      isPinned: true,
      updatedAt: new Date("2026-06-20T00:00:00.000Z"),
      tags: [],
    },
    {
      id: "note-2",
      title: "Note 2",
      body: "- [ ] Item 1\n- [x] Item 2",
      color: "blue",
      isPinned: false,
      updatedAt: new Date("2026-06-19T23:00:00.000Z"),
      tags: [],
    },
  ];

  it("should render both Pinned and Others sections with notes", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <KeepWorkspace
          notes={mockNotes}
          keepRootId="keep-root-123"
          allTags={[]}
        />
      );
    });

    // Check Pinned header
    expect(container.textContent).toContain("Pinned");
    expect(container.textContent).toContain("Note 1");

    // Check others section and note 2 title
    expect(container.textContent).toContain("Note 2");
    // Check note 2 checklist items parsed
    expect(container.textContent).toContain("Item 1");
    expect(container.textContent).toContain("Item 2");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should expand the creation bar when clicked", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <KeepWorkspace
          notes={mockNotes}
          keepRootId="keep-root-123"
          allTags={[]}
        />
      );
    });

    // Confirm collapsed state has 'Take a note...' text
    expect(container.textContent).toContain("Take a note...");
    
    // Find the collapsed bar container and click it
    const collapsedBar = container.querySelector(".cursor-text") as HTMLDivElement;
    expect(collapsedBar).not.toBeNull();

    await act(async () => {
      collapsedBar.click();
    });

    // Confirm expanded state now has 'Title' placeholder and 'Close' button
    const titleInput = container.querySelector("input[placeholder='Title']");
    expect(titleInput).not.toBeNull();
    expect(container.textContent).toContain("Close");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should render KeepEditModal inside a portal on document.body, not within the workspace container", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <KeepWorkspace
          notes={mockNotes}
          keepRootId="keep-root-123"
          allTags={[]}
        />
      );
    });

    const card = Array.from(container.querySelectorAll("h3")).find(
      (el) => el.textContent === "Note 1"
    )?.closest(".cursor-pointer") as HTMLDivElement;
    
    expect(card).not.toBeNull();

    await act(async () => {
      card.click();
    });

    const modalTitleInput = document.body.querySelector("input[value='Note 1']");
    expect(modalTitleInput).not.toBeNull();

    const modalContainer = modalTitleInput?.closest(".fixed");
    expect(modalContainer).not.toBeNull();
    expect(container.contains(modalContainer!)).toBe(false);
    expect(document.body.contains(modalContainer!)).toBe(true);

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

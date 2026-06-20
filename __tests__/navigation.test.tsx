import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { NoteEditor } from "@/app/notes/note-editor";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock action modules to avoid server-side dependency issues
vi.mock("@/app/notes/actions", () => ({
  updateNoteAction: vi.fn(),
}));
vi.mock("@/app/media/actions", () => ({
  getPresignedUploadUrlAction: vi.fn(),
  createMediaAssetAction: vi.fn(),
}));
vi.mock("@/app/tags/actions", () => ({
  toggleNoteTagAction: vi.fn(),
  createTagAction: vi.fn(),
}));

// Mock crepe and milkdown dependencies to avoid initializing the full editor DOM/wasm during unit tests
vi.mock("@milkdown/react", () => ({
  Milkdown: () => <div data-testid="milkdown">Milkdown Editor</div>,
  MilkdownProvider: ({ children }: any) => <>{children}</>,
  useEditor: () => {},
}));

vi.mock("@milkdown/crepe", () => ({
  Crepe: class {},
  CrepeFeature: {},
}));

describe("NoteEditor Media Link Interception", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should intercept media asset link clicks and navigate to the file preview page", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const mockNote = {
      id: "note-123",
      title: "Test Note",
      body: "Check out this [diagram](r2-diagram-url)",
    };

    const mockImageMediaAssets = [
      {
        id: "media-456",
        filename: "diagram.png",
        location: "Vault",
        url: "r2-diagram-url",
        folderId: "folder-789",
      },
    ];

    await act(async () => {
      root.render(
        <NoteEditor
          note={mockNote}
          imageMediaAssets={mockImageMediaAssets}
          allTags={[]}
          assignedTags={[]}
        />
      );
    });

    // We can simulate a click on an anchor tag in the filebucket-crepe container
    const editorContainer = container.querySelector(".filebucket-crepe");
    expect(editorContainer).not.toBeNull();

    // Create a mock link inside editorContainer
    const linkEl = document.createElement("a");
    linkEl.setAttribute("href", "r2-diagram-url");
    linkEl.textContent = "diagram";
    editorContainer?.appendChild(linkEl);

    // Click the link
    await act(async () => {
      linkEl.click();
    });

    // Check that we intercepted the click and routed correctly
    expect(mockPush).toHaveBeenCalledWith("/?folder=folder-789&media=media-456");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

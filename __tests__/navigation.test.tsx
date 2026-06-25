import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { NoteEditor } from "@/app/notes/note-editor";

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

// Mock next/dynamic to return a synchronous mock editor
vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockedFilebucketEditor(props: any) {
      return (
        <div 
          className={props.className}
          onClick={(e) => {
            const anchor = (e.target as HTMLElement).closest("a");
            if (anchor && props.onLinkClick) {
              const href = anchor.getAttribute("href");
              if (href) {
                props.onLinkClick(href, e);
              }
            }
          }}
        >
          <div className="ProseMirror">
            Mocked Editor Content
          </div>
        </div>
      );
    };
  }
}));

describe("NoteEditor Media Link Interception", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should intercept media asset link clicks and navigate to the file preview page via pushState", async () => {
    const pushStateSpy = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    
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

    const editorContainer = container.querySelector(".filebucket-crepe");
    expect(editorContainer).not.toBeNull();

    const linkEl = document.createElement("a");
    linkEl.setAttribute("href", "r2-diagram-url");
    linkEl.textContent = "diagram";
    editorContainer?.appendChild(linkEl);

    await act(async () => {
      linkEl.click();
    });

    // Check that we intercepted the click and routed correctly via history.pushState
    expect(pushStateSpy).toHaveBeenCalledWith(null, "", "/?folder=folder-789&media=media-456");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
    pushStateSpy.mockRestore();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { MangaReader } from "@/components/manga-reader";

// Mock URL.revokeObjectURL
const revokeObjectURLSpy = vi.fn();
const originalRevoke = global.URL.revokeObjectURL;
global.URL.revokeObjectURL = revokeObjectURLSpy;

describe("MangaReader Component Redo (TDD)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  const mockPages = [
    { name: "page1.png", url: "blob:url1" },
    { name: "page2.png", url: "blob:url2" },
    { name: "page3.png", url: "blob:url3" },
  ];

  it("should render and display the active page image", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCloseSpy = vi.fn();

    await act(async () => {
      root.render(
        <MangaReader
          isOpen={true}
          onClose={onCloseSpy}
          title="Manga Test Title"
          pages={mockPages}
          initialPageIndex={0}
        />
      );
    });

    // Check title in header
    expect(document.body.textContent).toContain("Manga Test Title");

    // Check image src
    const img = document.body.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("blob:url1");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should revoke all blob URLs on close", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCloseSpy = vi.fn();

    await act(async () => {
      root.render(
        <MangaReader
          isOpen={true}
          onClose={onCloseSpy}
          title="Manga Test Title"
          pages={[
            {
              name: "page1.png",
              load: async () => {
                const url = "blob:dynamic-url";
                return url;
              },
            },
          ]}
          initialPageIndex={0}
        />
      );
    });

    // Wait a brief moment to allow load trigger
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Close reader by clicking the close button
    const closeBtn = document.body.querySelector("[data-testid='close-reader']");
    expect(closeBtn).not.toBeNull();
    if (closeBtn) {
      await act(async () => {
        closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    }

    expect(onCloseSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

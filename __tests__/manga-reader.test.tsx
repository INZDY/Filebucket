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

  async function mountReader(ui: React.ReactElement) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(ui);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    return { root, container };
  }

  function typeInto(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("shows a page jump input and keeps the page filename out of the footer", async () => {
    const { root, container } = await mountReader(
      <MangaReader isOpen={true} onClose={vi.fn()} title="Chapter One" pages={mockPages} />
    );

    const jumpInput = document.body.querySelector(
      "input[aria-label='Jump to page']"
    ) as HTMLInputElement | null;
    expect(jumpInput).not.toBeNull();
    expect(jumpInput?.value).toBe("1");
    expect(document.body.textContent).toContain("/ 3");
    expect(document.body.textContent).not.toContain("page1.png");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("jumps to a typed page number on Enter", async () => {
    const { root, container } = await mountReader(
      <MangaReader isOpen={true} onClose={vi.fn()} title="Chapter One" pages={mockPages} />
    );

    const jumpInput = document.body.querySelector(
      "input[aria-label='Jump to page']"
    ) as HTMLInputElement;

    await act(async () => {
      typeInto(jumpInput, "3");
    });
    await act(async () => {
      jumpInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.body.querySelector("img")?.getAttribute("src")).toBe("blob:url3");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("pages with Space, PageDown and the arrow keys but not while typing in the jump input", async () => {
    const { root, container } = await mountReader(
      <MangaReader isOpen={true} onClose={vi.fn()} title="Chapter One" pages={mockPages} />
    );

    const imgSrc = () => document.body.querySelector("img")?.getAttribute("src");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });
    expect(imgSrc()).toBe("blob:url2");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    });
    expect(imgSrc()).toBe("blob:url3");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    expect(imgSrc()).toBe("blob:url2");

    const jumpInput = document.body.querySelector(
      "input[aria-label='Jump to page']"
    ) as HTMLInputElement;
    await act(async () => {
      jumpInput.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });
    expect(imgSrc()).toBe("blob:url2");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("restores saved progress and persists the page on close", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) {
        return {
          ok: true,
          json: async () => ({
            position: "1",
            percentage: 50,
            settings: { mangaLayoutMode: "paged-ltr" },
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { root, container } = await mountReader(
      <MangaReader
        isOpen={true}
        onClose={vi.fn()}
        title="Chapter One"
        pages={mockPages}
        mediaId="asset-1"
      />
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/media/progress?mediaAssetId=asset-1");
    expect(document.body.querySelector("img")?.getAttribute("src")).toBe("blob:url2");

    const closeBtn = document.body.querySelector("[data-testid='close-reader']");
    await act(async () => {
      closeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
    expect(postCall).toBeDefined();
    const body = JSON.parse(String(postCall?.[1]?.body));
    expect(body).toMatchObject({
      mediaAssetId: "asset-1",
      position: "1",
      percentage: 50,
      settings: { mangaLayoutMode: "paged-ltr" },
    });

    vi.unstubAllGlobals();
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

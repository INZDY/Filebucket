import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { BookReader } from "@/components/book-reader";

// Mock epubjs
vi.mock("epubjs", () => {
  const mockRendition = {
    display: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    flow: vi.fn(),
    themes: {
      register: vi.fn(),
      select: vi.fn(),
      fontSize: vi.fn(),
    },
    next: vi.fn().mockResolvedValue(undefined),
    prev: vi.fn().mockResolvedValue(undefined),
  };
  const mockBook = {
    renderTo: vi.fn(() => mockRendition),
    ready: Promise.resolve(),
    opened: Promise.resolve(),
    on: vi.fn(),
    locations: {
      generate: vi.fn().mockResolvedValue([]),
      percentageFromCfi: vi.fn().mockReturnValue(0.5),
      locationFromCfi: vi.fn().mockReturnValue(0),
      length: vi.fn().mockReturnValue(100),
    },
    navigation: {
      toc: [
        { label: "Chapter 1", href: "chap-1" },
        { label: "Chapter 2", href: "chap-2#section-2" },
      ],
    },
    loaded: {
      navigation: Promise.resolve({
        toc: [
          { label: "Chapter 1", href: "chap-1" },
          { label: "Chapter 2", href: "chap-2#section-2" },
        ]
      })
    },
    spine: {
      spineItems: [
        { href: "OEBPS/chap-1.xhtml", index: 0 },
        { href: "OEBPS/chap-2.xhtml", index: 1 },
      ],
      get: vi.fn((target) => {
        if (target === "OEBPS/chap-1.xhtml") return { href: "OEBPS/chap-1.xhtml", index: 0 };
        if (target === "OEBPS/chap-2.xhtml") return { href: "OEBPS/chap-2.xhtml", index: 1 };
        return null;
      }),
    }
  };
  (mockRendition as any).book = mockBook;
  const mockEpub = vi.fn(() => mockBook);
  return {
    default: mockEpub,
    mockBook,
    mockRendition,
  };
});

// Mock global fetch for API progress and text file calls
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.toString().includes("progress")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ position: "epubcfi(chap-1)", percentage: 10 }),
    } as any);
  }
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve("mocked text content"),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  } as any);
});

describe("BookReader Component (TDD)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean document.body between runs
    document.body.innerHTML = "";
  });

  it("should render plain text viewer for TXT files", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BookReader
          isOpen={true}
          onClose={vi.fn()}
          title="Test Book.txt"
          url="http://localhost/test.txt"
          contentType="text/plain"
          mediaId="media-123"
        />
      );
    });

    // Check title in document.body because it's rendered in a portal
    expect(document.body.textContent).toContain("Test Book.txt");
    const containerEl = document.body.querySelector(".book-reader-overlay");
    expect(containerEl).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should support switching theme and layout modes", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BookReader
          isOpen={true}
          onClose={vi.fn()}
          title="Test Book.txt"
          url="http://localhost/test.txt"
          contentType="text/plain"
          mediaId="media-123"
        />
      );
    });

    // Open settings dropdown first
    const settingsBtn = document.body.querySelector("[data-testid='settings-toggle']");
    expect(settingsBtn).not.toBeNull();
    if (settingsBtn) {
      await act(async () => {
        settingsBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    }

    // Verify presence of layout toggle button and theme options in document.body
    const layoutToggle = document.body.querySelector("[data-testid='settings-dropdown']");
    expect(layoutToggle).not.toBeNull();

    const themeToggle = document.body.querySelector("[data-testid='theme-toggle-sepia']");
    expect(themeToggle).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should invoke onClose callback when close button is clicked", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCloseSpy = vi.fn();

    await act(async () => {
      root.render(
        <BookReader
          isOpen={true}
          onClose={onCloseSpy}
          title="Test Book.epub"
          url="http://localhost/test.epub"
          contentType="application/epub+zip"
          mediaId="media-123"
        />
      );
    });

    const closeBtn = document.body.querySelector("[data-testid='close-reader']");
    expect(closeBtn).not.toBeNull();
    if (closeBtn) {
      await act(async () => {
        closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(onCloseSpy).toHaveBeenCalled();
    }

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should resolve TOC path mismatch and preserve hash fragment on TOC item click", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BookReader
          isOpen={true}
          onClose={vi.fn()}
          title="Test Book.epub"
          url="http://localhost/test.epub"
          contentType="application/epub+zip"
          mediaId="media-123"
        />
      );
    });

    // 1. Open the TOC drawer
    const buttons = Array.from(document.body.querySelectorAll("button"));
    const tocBtn = buttons.find((btn) => btn.textContent?.includes("TOC"));
    expect(tocBtn).not.toBeNull();
    if (tocBtn) {
      await act(async () => {
        tocBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    }

    // 2. Find TOC buttons inside aside
    const chapButtons = Array.from(document.body.querySelectorAll("aside button"));
    const chap1Btn = chapButtons.find((btn) => btn.textContent?.includes("Chapter 1"));
    expect(chap1Btn).not.toBeNull();

    // 3. Click Chapter 1
    if (chap1Btn) {
      await act(async () => {
        chap1Btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    }

    const { mockRendition } = await import("epubjs") as any;
    expect(mockRendition.display).toHaveBeenCalledWith("OEBPS/chap-1.xhtml");

    // 4. Click Chapter 2 (with hash fragment 'chap-2#section-2')
    const chap2Btn = chapButtons.find((btn) => btn.textContent?.includes("Chapter 2"));
    expect(chap2Btn).not.toBeNull();
    if (chap2Btn) {
      await act(async () => {
        // Re-open TOC drawer if closed by handleTocClick
        const buttonsAfterClick = Array.from(document.body.querySelectorAll("button"));
        const tocBtn2 = buttonsAfterClick.find((btn) => btn.textContent?.includes("TOC"));
        if (tocBtn2) {
          tocBtn2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
      });

      // Find chap2Btn again after re-rendering
      const chapButtons2 = Array.from(document.body.querySelectorAll("aside button"));
      const chap2BtnRef = chapButtons2.find((btn) => btn.textContent?.includes("Chapter 2"));
      expect(chap2BtnRef).not.toBeNull();

      if (chap2BtnRef) {
        await act(async () => {
          chap2BtnRef.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
      }
    }

    expect(mockRendition.display).toHaveBeenCalledWith("OEBPS/chap-2.xhtml#section-2");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

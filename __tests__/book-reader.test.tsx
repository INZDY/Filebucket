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
    locations: {
      generate: vi.fn().mockResolvedValue([]),
      percentageFromCfi: vi.fn().mockReturnValue(0.5),
    },
    navigation: {
      toc: [
        { label: "Chapter 1", href: "chap-1" },
        { label: "Chapter 2", href: "chap-2" },
      ],
    },
  };
  const mockEpub = vi.fn(() => mockBook);
  return {
    default: mockEpub,
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

    // Verify presence of layout toggle button and theme options in document.body
    const layoutToggle = document.body.querySelector("[data-testid='layout-toggle']");
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
});

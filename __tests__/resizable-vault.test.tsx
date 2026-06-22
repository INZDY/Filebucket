import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ResizableVault } from "@/app/vault/resizable-vault";

// Mock matchMedia to handle screen size logic
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  value: ResizeObserverMock,
  writable: true,
});
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserverMock,
  writable: true,
});



describe("ResizableVault Sidebar Sizing & Persistence", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
    }
  });

  it("should default sidebar width to minimum size (20%) when no localStorage width exists", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ResizableVault
          browser={<div data-testid="browser">Browser Sidebar</div>}
          content={<div data-testid="content">Main Content</div>}
        />
      );
    });

    const browserPanel = container.querySelector("#browser");
    expect(browserPanel).not.toBeNull();
    // Default size is 20% if no localStorage value is present
    expect(browserPanel?.getAttribute("style")).toContain("flex: 20");
    
    root.unmount();
  });

  it("should restore sidebar width from localStorage if it exists", async () => {
    localStorage.setItem("filebucket_sidebar_width", "35");

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ResizableVault
          browser={<div data-testid="browser">Browser Sidebar</div>}
          content={<div data-testid="content">Main Content</div>}
        />
      );
    });

    const browserPanel = container.querySelector("#browser");
    expect(browserPanel).not.toBeNull();
    // Width is restored to 35%
    expect(browserPanel?.getAttribute("style")).toContain("flex: 35");

    root.unmount();
  });
});

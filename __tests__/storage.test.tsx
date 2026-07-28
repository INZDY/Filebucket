import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { GET } from "@/app/api/storage/usage/route";
import { SidebarBrowser } from "@/app/vault/sidebar-browser";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Mock matchMedia
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

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", {
  value: ResizeObserverMock,
});
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserverMock,
});

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    mediaAsset: {
      aggregate: vi.fn(),
    },
  },
}));

// Mock fetch
const originalFetch = global.fetch;
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("Storage Usage Milestone 52", () => {
  describe("API Endpoint: GET /api/storage/usage", () => {
    it("should return 401 Unauthorized if no active session", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should return aggregates of sizeBytes for media assets", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
        expires: "tomorrow",
      });
      vi.mocked(prisma.mediaAsset.aggregate).mockResolvedValue({
        _sum: { sizeBytes: 157286400 }, // 150 MB
      } as any);

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.usedBytes).toBe(157286400);
      expect(prisma.mediaAsset.aggregate).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        _sum: { sizeBytes: true },
      });
    });
  });

  describe("Sidebar Component Rendering", () => {
    it("should render storage progress bar and used/total quota dynamically", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ usedBytes: 104857600 }), // 100 MB
      } as any);

      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <SidebarBrowser
            userId="user-123"
            isTrashView={false}
            query=""
            activeTagSlug=""
            activeTag={null}
            selectedFolder={null}
            selectedNote={null}
            selectedMedia={null}
            selectedDeletedFolder={null}
            selectedDeletedNote={null}
            selectedDeletedMedia={null}
            folders={[]}
            deletedFolders={[]}
            deletedNotes={[]}
            deletedMediaAssets={[]}
            tags={[]}
            notes={[]}
            mediaAssets={[]}
            folderTrail={[]}
            folderDestinations={[]}
            matchingFolders={[]}
            isFilteredView={false}
            isVaultRootActive={true}
            browserTitle="Vault Browser"
            trashCount={0}
            returnTo="/"
            activeMode="FILES"
          />
        );
      });

      // Wait a microtask for the fetch mock to resolve and state to update
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(container.textContent).toContain("Storage");
      expect(container.textContent).toContain("100 MB");
      expect(container.textContent).toContain("10 GB");

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });
});

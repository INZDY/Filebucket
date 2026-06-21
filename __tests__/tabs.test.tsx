import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { MainContentTabs } from "@/app/vault/main-content-tabs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("MainContentTabs", () => {
  it("should open notes in separate tabs", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
 
    const activeTabNote1 = {
      id: "note-1",
      type: "note" as const,
      title: "Note 1",
      href: "/?note=note-1",
    };
 
    const activeTabNote2 = {
      id: "note-2",
      type: "note" as const,
      title: "Note 2",
      href: "/?note=note-2",
    };
 
    // 1. Render first note
    await act(async () => {
      root.render(
        <MainContentTabs activeTab={activeTabNote1} activeMode="NOTES" fallbackHref="/">
          <div>Content</div>
        </MainContentTabs>
      );
    });
 
    expect(container.textContent).toContain("Note 1");
 
    // 2. Render second note
    await act(async () => {
      root.render(
        <MainContentTabs activeTab={activeTabNote2} activeMode="NOTES" fallbackHref="/">
          <div>Content</div>
        </MainContentTabs>
      );
    });
 
    expect(container.textContent).toContain("Note 1");
    expect(container.textContent).toContain("Note 2");
 
    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should preserve independent workspace tabs when switching modes", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const fileTab = {
      id: "media-1",
      type: "media" as const,
      title: "File.png",
      href: "/?media=media-1",
    };

    const noteTab = {
      id: "note-1",
      type: "note" as const,
      title: "Note.md",
      href: "/?note=note-1",
    };

    // Render in FILES mode with fileTab - should NOT show any tabs
    await act(async () => {
      root.render(
        <MainContentTabs activeTab={fileTab} activeMode="FILES" fallbackHref="/">
          <div>Content</div>
        </MainContentTabs>
      );
    });

    expect(container.textContent).not.toContain("File.png");
    expect(container.textContent).toContain("Content");

    // Switch to NOTES mode, render noteTab - should show note tab
    await act(async () => {
      root.render(
        <MainContentTabs activeTab={noteTab} activeMode="NOTES" fallbackHref="/">
          <div>Content</div>
        </MainContentTabs>
      );
    });

    expect(container.textContent).toContain("Note.md");
    expect(container.textContent).toContain("Content");

    // Switch back to FILES mode - note tabs should remain in background, and no files tab is rendered
    await act(async () => {
      root.render(
        <MainContentTabs activeMode="FILES" fallbackHref="/">
          <div>Content</div>
        </MainContentTabs>
      );
    });

    expect(container.textContent).not.toContain("File.png");
    expect(container.textContent).not.toContain("Note.md");
    expect(container.textContent).toContain("Content");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should render mobile active note title and tabs button, and open bottom sheet switcher on click", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const activeTabNote = {
      id: "note-1",
      type: "note" as const,
      title: "My Mobile Note",
      href: "/?note=note-1",
    };

    await act(async () => {
      root.render(
        <MainContentTabs activeTab={activeTabNote} activeMode="NOTES" fallbackHref="/">
          <div>Content</div>
        </MainContentTabs>
      );
    });

    // Check that mobile tab header is rendered
    expect(container.textContent).toContain("My Mobile Note");
    expect(container.textContent).toContain("Tabs");

    // Initially, bottom sheet has opacity-0 pointer-events-none class (closed)
    const backdrop = container.querySelector(".fixed.inset-0.z-50.bg-black\\/60");
    expect(backdrop).not.toBeNull();
    expect(backdrop?.className).toContain("opacity-0");

    // Click the Tabs button
    const tabsBtn = Array.from(container.querySelectorAll("button")).find(btn => btn.textContent?.includes("Tabs"));
    expect(tabsBtn).not.toBeUndefined();

    await act(async () => {
      tabsBtn?.click();
    });

    // Now, bottom sheet should have opacity-100 class (opened)
    expect(backdrop?.className).toContain("opacity-100");
    expect(container.textContent).toContain("Open Tabs (1)");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

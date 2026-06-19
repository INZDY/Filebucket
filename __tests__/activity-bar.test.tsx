import { describe, it, expect } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ActivityBar } from "@/components/activity-bar";

describe("ActivityBar Component", () => {
  it("should render navigation links with correct folder hrefs", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ActivityBar
          activeMode="NOTES"
          notesRootId="notes-123"
          keepRootId="keep-456"
          chatRootId="chat-789"
        />
      );
    });

    const links = container.querySelectorAll("a");
    // We expect 4 main links (Files, Notes, Keep, Chat)
    expect(links.length).toBe(4);

    const hrefs = Array.from(links).map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/?folder=notes-123");
    expect(hrefs).toContain("/?folder=keep-456");
    expect(hrefs).toContain("/?folder=chat-789");

    // Verify NOTES link has an active class indicating highlight
    const notesLink = Array.from(links).find((l) => l.getAttribute("href") === "/?folder=notes-123");
    expect(notesLink?.className).toContain("text-purple-400"); // Or our styled highlight class name

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

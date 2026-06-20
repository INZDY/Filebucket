import { describe, it, expect } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ActivityBar } from "@/components/activity-bar";

describe("ActivityBar Component", () => {
  it("should render navigation links with correct folder hrefs and Trash link", async () => {
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
    // We expect 5 main links (Files, Notes, Keep, Chat, Trash)
    expect(links.length).toBe(5);

    const hrefs = Array.from(links).map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/?folder=notes-123");
    expect(hrefs).toContain("/?folder=keep-456");
    expect(hrefs).toContain("/?folder=chat-789");
    expect(hrefs).toContain("/?view=trash");

    // Verify NOTES link has an active class indicating highlight
    const notesLink = Array.from(links).find((l) => l.getAttribute("href") === "/?folder=notes-123");
    expect(notesLink?.className).toContain("text-purple-400");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should highlight Trash link with text-rose-400 class when activeMode is TRASH", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ActivityBar
          activeMode="TRASH"
          notesRootId="notes-123"
          keepRootId="keep-456"
          chatRootId="chat-789"
        />
      );
    });

    const links = container.querySelectorAll("a");
    const trashLink = Array.from(links).find((l) => l.getAttribute("href") === "/?view=trash");
    expect(trashLink?.className).toContain("text-rose-400");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});


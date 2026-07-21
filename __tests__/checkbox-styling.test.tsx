import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { FilebucketEditor } from "@/components/filebucket-editor";

describe("Checkbox Alignment & Mode-Aware Theme Colors (TDD)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (container) {
      document.body.removeChild(container);
    }
  });

  it("should apply 'notes-editor' class in Obsidian Notes mode", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FilebucketEditor
          markdown={"- [ ] Obsidian Task Item"}
          onChange={vi.fn()}
          mode="notes"
        />
      );
    });

    const proseEl = container.querySelector(".prose");
    expect(proseEl).not.toBeNull();
    expect(proseEl?.classList.contains("notes-editor")).toBe(true);
    expect(proseEl?.classList.contains("keep-editor")).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });

  it("should apply 'keep-editor' class in Keep mode", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FilebucketEditor
          markdown={"- [ ] Keep Task Item"}
          onChange={vi.fn()}
          mode="keep"
        />
      );
    });

    const proseEl = container.querySelector(".prose");
    expect(proseEl).not.toBeNull();
    expect(proseEl?.classList.contains("keep-editor")).toBe(true);
    expect(proseEl?.classList.contains("notes-editor")).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });
});

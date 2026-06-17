import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ExportButton } from "@/components/export-button";

describe("ExportButton UI Component", () => {
  it("should trigger confirm dialog and allow download on confirm", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const confirmSpy = vi.spyOn(window, "confirm");

    // Mock confirm to return true (user clicks OK)
    confirmSpy.mockReturnValue(true);

    await act(async () => {
      root.render(<ExportButton email="test@filebucket.local" />);
    });

    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("/api/export");

    // Prevent default navigation in jsdom
    anchor?.addEventListener("click", (e) => {
      e.preventDefault();
    });

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor?.dispatchEvent(event);
    
    expect(confirmSpy).toHaveBeenCalledWith("Are you sure you want to export your vault?");

    // Mock confirm to return false (user clicks Cancel)
    confirmSpy.mockReturnValue(false);
    
    const event2 = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor?.dispatchEvent(event2);
    expect(event2.defaultPrevented).toBe(true);

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
    confirmSpy.mockRestore();
  });
});

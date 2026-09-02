import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { CardActionsMenu } from "@/components/card-actions-menu";

function setNativeInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("CardActionsMenu", () => {
  let container: HTMLDivElement;
  let onRename: ReturnType<typeof vi.fn<(name: string) => void>>;
  let onMove: ReturnType<typeof vi.fn<(folderId: string | null) => void>>;
  let onTrash: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onRename = vi.fn<(name: string) => void>();
    onMove = vi.fn<(folderId: string | null) => void>();
    onTrash = vi.fn<() => void>();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
    }
  });

  const destinations = [
    { id: "folder-a", name: "Personal Work" },
    { id: "folder-b", name: "Sub-project" },
  ];

  function render(props?: Partial<React.ComponentProps<typeof CardActionsMenu>>) {
    const root = createRoot(container);
    act(() => {
      root.render(
        <CardActionsMenu
          currentFolderId={null}
          currentName="Pic.png"
          destinations={destinations}
          id="item-1"
          label="Pic.png"
          onMove={onMove}
          onRename={onRename}
          onTrash={onTrash}
          {...props}
        />
      );
    });
    return root;
  }

  it("renders a compact 3-dot trigger button", () => {
    render();
    const trigger = container.querySelector("button[aria-label='Actions for Pic.png']") as HTMLElement;
    expect(trigger).not.toBeNull();
    expect(trigger.className).toContain("h-7");
    expect(trigger.className).toContain("w-7");
  });

  it("opens the menu with Rename, Move, and Move to trash", () => {
    render();
    const trigger = container.querySelector("button[aria-label='Actions for Pic.png']") as HTMLElement;
    act(() => {
      trigger.click();
    });
    const text = container.textContent || "";
    expect(text).toContain("Rename");
    expect(text).toContain("Move");
    expect(text).toContain("Move to trash");
  });

  it("shows the rename form and submits the new name", () => {
    render();
    const trigger = container.querySelector("button[aria-label='Actions for Pic.png']") as HTMLElement;
    act(() => {
      trigger.click();
    });
    const renameButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.includes("Rename")
    ) as HTMLElement;
    act(() => {
      renameButton.click();
    });
    const input = container.querySelector("input[name='name']") as HTMLInputElement;
    expect(input).not.toBeNull();
    setNativeInputValue(input, "Renamed.png");
    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Save"
    ) as HTMLElement;
    act(() => {
      saveButton.click();
    });
    expect(onRename).toHaveBeenCalledWith("Renamed.png");
  });

  it("shows the move form and submits the chosen folder", () => {
    render({ currentFolderId: "folder-a" });
    const trigger = container.querySelector("button[aria-label='Actions for Pic.png']") as HTMLElement;
    act(() => {
      trigger.click();
    });
    const moveButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Move"
    ) as HTMLElement;
    act(() => {
      moveButton.click();
    });
    const select = container.querySelector("select[name='folderId']") as HTMLSelectElement;
    expect(select).not.toBeNull();
    const submit = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Move"
    ) as HTMLElement;
    act(() => {
      submit.click();
    });
    expect(onMove).toHaveBeenCalledWith("folder-a");
  });

  it("excludes the entity's own id from move destinations", () => {
    render({ excludeIds: ["folder-b"] });
    const trigger = container.querySelector("button[aria-label='Actions for Pic.png']") as HTMLElement;
    act(() => {
      trigger.click();
    });
    const moveButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "Move"
    ) as HTMLElement;
    act(() => {
      moveButton.click();
    });
    const options = Array.from(container.querySelectorAll("select[name='folderId'] option")).map(
      (el) => el.textContent
    );
    expect(options).toContain("Personal Work");
    expect(options).not.toContain("Sub-project");
  });

  it("submits trash through onTrash", () => {
    render();
    const trigger = container.querySelector("button[aria-label='Actions for Pic.png']") as HTMLElement;
    act(() => {
      trigger.click();
    });
    const trashButton = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.includes("Move to trash")
    ) as HTMLElement;
    act(() => {
      trashButton.click();
    });
    expect(onTrash).toHaveBeenCalled();
  });
});

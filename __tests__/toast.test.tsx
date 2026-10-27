import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { Toaster, toastError, toastSuccess } from "@/components/ui/toast";

describe("Toaster", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  async function mountToaster() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Toaster />);
    });
    return { root, container };
  }

  it("renders success and error toasts dispatched through the helpers", async () => {
    const { root, container } = await mountToaster();

    await act(async () => {
      toastSuccess("Saved");
      toastError("Move failed");
    });

    expect(document.body.textContent).toContain("Saved");
    expect(document.body.textContent).toContain("Move failed");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("keeps at most three toasts stacked", async () => {
    const { root, container } = await mountToaster();

    await act(async () => {
      toastSuccess("One");
      toastSuccess("Two");
      toastSuccess("Three");
      toastSuccess("Four");
    });

    expect(document.body.textContent).not.toContain("One");
    expect(document.body.textContent).toContain("Two");
    expect(document.body.textContent).toContain("Three");
    expect(document.body.textContent).toContain("Four");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("dismisses a toast through its close button", async () => {
    const { root, container } = await mountToaster();

    await act(async () => {
      toastError("Something broke");
    });

    const closeButton = document.body.querySelector(
      "[aria-label='Dismiss notification']"
    ) as HTMLButtonElement | null;
    expect(closeButton).not.toBeNull();

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).not.toContain("Something broke");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ReaderContainer, ReaderHeader, ReaderFooter } from "@/components/reader-shared";
import { useReaderOverlay, useReaderSwipe } from "@/components/reader-shared";

describe("Shared Reader Components & Hooks (TDD)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.style.overflow = "unset";
  });

  describe("ReaderContainer", () => {
    it("should render children in a portal and toggle body overflow", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      expect(document.body.style.overflow).not.toBe("hidden");

      await act(async () => {
        root.render(
          <ReaderContainer isOpen={true} onClose={vi.fn()}>
            <div data-testid="child">Test Child</div>
          </ReaderContainer>
        );
      });

      // Verify portal mounting
      const child = document.body.querySelector("[data-testid='child']");
      expect(child).not.toBeNull();
      expect(child?.textContent).toBe("Test Child");

      // Verify overflow lock
      expect(document.body.style.overflow).toBe("hidden");

      await act(async () => {
        root.unmount();
      });

      // Verify overflow restored
      expect(document.body.style.overflow).toBe("unset");
      document.body.removeChild(container);
    });

    it("should trigger onClose on Escape keydown", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      const onCloseSpy = vi.fn();

      await act(async () => {
        root.render(
          <ReaderContainer isOpen={true} onClose={onCloseSpy}>
            <div>Content</div>
          </ReaderContainer>
        );
      });

      // Trigger Escape key
      const escEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      window.dispatchEvent(escEvent);

      expect(onCloseSpy).toHaveBeenCalled();

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  describe("ReaderHeader and ReaderFooter", () => {
    it("should render title and controls in header and progress in footer", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <div>
            <ReaderHeader title="My Reader Title" onClose={vi.fn()}>
              <button data-testid="settings-btn">Settings</button>
            </ReaderHeader>
            <ReaderFooter progressText="Page 1 of 10" percentage={10} />
          </div>
        );
      });

      expect(document.body.textContent).toContain("My Reader Title");
      expect(document.body.querySelector("[data-testid='settings-btn']")).not.toBeNull();
      expect(document.body.textContent).toContain("Page 1 of 10");

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  describe("useReaderOverlay", () => {
    it("should toggle overlay state", () => {
      let toggleVal = false;
      const TestComponent = () => {
        const { isUiVisible, toggleUiVisibility } = useReaderOverlay(true);
        toggleVal = isUiVisible;
        return <button onClick={toggleUiVisibility} data-testid="btn">Toggle</button>;
      };

      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(<TestComponent />);
      });

      expect(toggleVal).toBe(true);

      const btn = document.body.querySelector("[data-testid='btn']");
      act(() => {
        btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(toggleVal).toBe(false);

      root.unmount();
      document.body.removeChild(container);
    });
  });

  describe("useReaderSwipe", () => {
    it("should trigger callbacks on swipes", () => {
      const onSwipeLeftSpy = vi.fn();
      const onSwipeRightSpy = vi.fn();

      const TestComponent = ({ isRtl }: { isRtl: boolean }) => {
        const swipeProps = useReaderSwipe({
          onSwipeLeft: onSwipeLeftSpy,
          onSwipeRight: onSwipeRightSpy,
          isRtl,
        });
        return <div data-testid="swipe-area" {...swipeProps}>Swipe Area</div>;
      };

      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(<TestComponent isRtl={false} />);
      });

      const swipeArea = document.body.querySelector("[data-testid='swipe-area']");

      // Simulate swipe left (next page in LTR)
      act(() => {
        swipeArea?.dispatchEvent(new TouchEvent("touchstart", {
          touches: [{ clientX: 200, clientY: 100 } as any],
          bubbles: true,
        }));
        swipeArea?.dispatchEvent(new TouchEvent("touchend", {
          changedTouches: [{ clientX: 50, clientY: 100 } as any],
          bubbles: true,
        }));
      });

      expect(onSwipeLeftSpy).toHaveBeenCalledTimes(1);

      // Simulate swipe right (prev page in LTR)
      act(() => {
        swipeArea?.dispatchEvent(new TouchEvent("touchstart", {
          touches: [{ clientX: 50, clientY: 100 } as any],
          bubbles: true,
        }));
        swipeArea?.dispatchEvent(new TouchEvent("touchend", {
          changedTouches: [{ clientX: 200, clientY: 100 } as any],
          bubbles: true,
        }));
      });

      expect(onSwipeRightSpy).toHaveBeenCalledTimes(1);

      root.unmount();
      document.body.removeChild(container);
    });
  });
});

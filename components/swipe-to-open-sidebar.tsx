"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { isStandaloneApp } from "@/lib/pwa";
import { shouldOpenSidebar } from "@/lib/swipe";

const NARROW_QUERY = "(max-width: 1023px)";
const IGNORED_START_TARGETS = "input, textarea, select, button, a, [contenteditable='true']";

/**
 * Opens the mobile sidebar with a rightward swipe: from the left edge in an
 * installed PWA, or from the header (`data-swipe-zone`) in a browser, where an
 * edge swipe would be taken by the browser's back gesture.
 */
export function SwipeToOpenSidebar({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const fromEdge = isStandaloneApp();
    const narrow = window.matchMedia(NARROW_QUERY);
    let start: { x: number; y: number } | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      start = null;
      if (!narrow.matches || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(IGNORED_START_TARGETS) || target?.closest("[data-swipe-ignore]")) {
        return;
      }
      if (!fromEdge && !target?.closest("[data-swipe-zone]")) {
        return;
      }

      start = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      if (
        shouldOpenSidebar({
          startX: start.x,
          startY: start.y,
          endX: touch.clientX,
          endY: touch.clientY,
          fromEdge,
        })
      ) {
        start = null;
        window.dispatchEvent(new CustomEvent("open-sidebar"));
      }
    };

    const reset = () => {
      start = null;
    };

    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: true });
    root.addEventListener("touchend", reset);
    root.addEventListener("touchcancel", reset);

    return () => {
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchmove", handleTouchMove);
      root.removeEventListener("touchend", reset);
      root.removeEventListener("touchcancel", reset);
    };
  }, []);

  return (
    <div className="contents" ref={rootRef}>
      {children}
    </div>
  );
}

import { describe, expect, it } from "vitest";

import { shouldOpenSidebar } from "@/lib/swipe";

describe("shouldOpenSidebar", () => {
  it("opens on a long rightward swipe", () => {
    expect(shouldOpenSidebar({ startX: 100, startY: 60, endX: 180, endY: 64, fromEdge: false })).toBe(true);
  });

  it("ignores short rightward drags", () => {
    expect(shouldOpenSidebar({ startX: 100, startY: 60, endX: 140, endY: 62, fromEdge: false })).toBe(false);
  });

  it("ignores vertical scrolling", () => {
    expect(shouldOpenSidebar({ startX: 100, startY: 60, endX: 180, endY: 130, fromEdge: false })).toBe(false);
  });

  it("ignores leftward swipes", () => {
    expect(shouldOpenSidebar({ startX: 200, startY: 60, endX: 100, endY: 60, fromEdge: false })).toBe(false);
  });

  it("requires an edge start when fromEdge is set", () => {
    expect(shouldOpenSidebar({ startX: 10, startY: 60, endX: 120, endY: 62, fromEdge: true })).toBe(true);
    expect(shouldOpenSidebar({ startX: 40, startY: 60, endX: 150, endY: 62, fromEdge: true })).toBe(false);
  });

  it("accepts a start anywhere when fromEdge is not set", () => {
    expect(shouldOpenSidebar({ startX: 220, startY: 60, endX: 320, endY: 62, fromEdge: false })).toBe(true);
  });
});

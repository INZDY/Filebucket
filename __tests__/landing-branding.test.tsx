import { describe, it, expect } from "vitest";
import { metadata } from "@/app/layout";

describe("Landing Page Branding & Favicon Metadata (TDD)", () => {
  it("should configure icon metadata in app/layout.tsx pointing to /icon.svg", () => {
    expect(metadata).toBeDefined();
    expect(metadata.icons).toBeDefined();
    // @ts-ignore
    expect(metadata.icons.icon).toBe("/icon.svg");
  });
});

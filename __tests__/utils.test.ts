import { describe, it, expect } from "vitest";
import { formatBytes } from "../lib/utils";

describe("formatBytes utility", () => {
  it("should format 0 bytes correctly", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("should format bytes under 1024 correctly", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("should format KB correctly", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536, 1)).toBe("1.5 KB");
    expect(formatBytes(1536, 0)).toBe("2 KB");
  });

  it("should format MB correctly", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(1024 * 1024 * 2.5, 1)).toBe("2.5 MB");
  });

  it("should format GB correctly", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
    expect(formatBytes(1024 * 1024 * 1024 * 1.75, 2)).toBe("1.75 GB");
  });

  it("should format TB correctly", () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
  });

  it("should handle negative input safely", () => {
    expect(formatBytes(-100)).toBe("0 B");
  });
});

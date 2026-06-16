import { describe, it, expect } from "vitest";
import { compareAlphanumeric } from "@/lib/sorting";

describe("compareAlphanumeric", () => {
  it("should sort filenames/titles with numbers naturally", () => {
    const list = ["f100", "f10", "f101", "f2", "f11"];
    const sorted = [...list].sort(compareAlphanumeric);
    expect(sorted).toEqual(["f2", "f10", "f11", "f100", "f101"]);
  });

  it("should handle case-insensitive sorting", () => {
    const list = ["Folder B", "folder a", "Folder C"];
    const sorted = [...list].sort(compareAlphanumeric);
    // Since we sort case-insensitively, we expect Folder B to come after folder a
    // And Folder C to come after Folder B. Let's make it match the exact case of original strings.
    expect(sorted).toEqual(["folder a", "Folder B", "Folder C"]);
  });

  it("should handle numbers within names and mixed casing", () => {
    const list = ["file10.png", "File2.png", "file1.png", "File20.png"];
    const sorted = [...list].sort(compareAlphanumeric);
    expect(sorted).toEqual(["file1.png", "File2.png", "file10.png", "File20.png"]);
  });
});

import { describe, it, expect } from "vitest";
import { parseMarkdownChecklist, serializeMarkdownChecklist } from "@/lib/keep";

describe("Google Keep Markdown Checklist Sync", () => {
  it("should correctly identify and parse standard markdown checklists", () => {
    const markdown = "- [ ] Buy milk\n- [x] Walk the dog\n- [ ] Clean room";
    const result = parseMarkdownChecklist(markdown);

    expect(result.isChecklist).toBe(true);
    expect(result.items.length).toBe(3);
    expect(result.items[0].text).toBe("Buy milk");
    expect(result.items[0].checked).toBe(false);
    expect(result.items[1].text).toBe("Walk the dog");
    expect(result.items[1].checked).toBe(true);
  });

  it("should return isChecklist = false for regular text notes", () => {
    const markdown = "This is a regular note with no checkboxes.\nAnother line.";
    const result = parseMarkdownChecklist(markdown);

    expect(result.isChecklist).toBe(false);
    expect(result.items.length).toBe(0);
  });

  it("should correctly serialize checklist items back to markdown checkboxes", () => {
    const items = [
      { text: "Item 1", checked: true },
      { text: "Item 2", checked: false },
    ];
    const markdown = serializeMarkdownChecklist(items);

    expect(markdown).toBe("- [x] Item 1\n- [ ] Item 2");
  });
});

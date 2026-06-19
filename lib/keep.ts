export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export function parseMarkdownChecklist(body: string): { items: ChecklistItem[]; isChecklist: boolean } {
  const lines = body.split("\n");
  const items: ChecklistItem[] = [];
  let isChecklist = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if the line matches a checklist pattern: "- [ ]" or "- [x]" or "- [X]"
    const match = /^- \[( |x|X)\] (.*)$/.exec(trimmed);
    if (match) {
      isChecklist = true;
      items.push({
        id: Math.random().toString(36).substring(2, 9),
        checked: match[1].toLowerCase() === "x",
        text: match[2].trim(),
      });
    }
  }

  return { items, isChecklist };
}

export function serializeMarkdownChecklist(items: { text: string; checked: boolean }[]): string {
  return items
    .map((item) => `- [${item.checked ? "x" : " "}] ${item.text.trim()}`)
    .join("\n");
}

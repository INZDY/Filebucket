import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { FilebucketEditor } from "@/components/filebucket-editor";

describe("FilebucketEditor Component (TDD)", () => {
  it("should render the editor and match initial markdown text", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleChange = vi.fn();

    await act(async () => {
      root.render(
        <FilebucketEditor
          markdown={"# Test Header\n\nSome markdown text."}
          onChange={handleChange}
          mode="notes"
        />
      );
    });

    // Verify h1 header tag rendered correctly
    const heading = container.querySelector("h1");
    expect(heading).toBeDefined();
    expect(heading?.textContent).toBe("Test Header");

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should preserve original item order when checklist items are checked (no auto-sorting)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleChange = vi.fn();
    let editorInstance: any = null;

    await act(async () => {
      root.render(
        <FilebucketEditor
          markdown={"- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3"}
          onChange={handleChange}
          mode="keep"
          onEditorReady={(editor) => {
            editorInstance = editor;
          }}
        />
      );
    });

    expect(editorInstance).toBeDefined();
    
    // Toggle checked status of the first checklist item ("Task 1")
    await act(async () => {
      editorInstance.commands.command(({ tr, state }: any) => {
        let taskItemPos = -1;
        state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === "taskItem" && taskItemPos === -1) {
            taskItemPos = pos;
          }
        });
        if (taskItemPos !== -1) {
          tr.setNodeMarkup(taskItemPos, undefined, { checked: true });
        }
        return true;
      });
    });

    // Verify that Task 1 stays at the top (checked) and does not jump to the bottom
    const output = editorInstance.getMarkdown();
    const normalised = output.replace(/\r/g, "").trim();
    
    expect(normalised).toContain("- [x] Task 1");
    expect(normalised).toContain("- [ ] Task 2");
    expect(normalised).toContain("- [ ] Task 3");

    // The sequential order should remain: Task 1 (checked) -> Task 2 -> Task 3
    const idx1 = normalised.indexOf("Task 1");
    const idx2 = normalised.indexOf("Task 2");
    const idx3 = normalised.indexOf("Task 3");

    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

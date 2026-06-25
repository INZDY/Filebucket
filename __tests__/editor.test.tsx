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

  it("should auto-sort checked checklist items to the bottom of the list block", async () => {
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

    // Verify that the markdown output moved Task 1 to the bottom and checked it
    const output = editorInstance.getMarkdown();
    
    // Clean up spacing and normalise formatting characters
    const normalised = output.replace(/\r/g, "").trim();
    
    // Expect Task 2 and Task 3 to remain unchecked at the top, and Task 1 checked at the bottom
    expect(normalised).toContain("- [ ] Task 2");
    expect(normalised).toContain("- [ ] Task 3");
    expect(normalised).toContain("- [x] Task 1");

    // The sequential order should be: Task 2 -> Task 3 -> Task 1 (checked)
    const idx2 = normalised.indexOf("Task 2");
    const idx3 = normalised.indexOf("Task 3");
    const idx1 = normalised.indexOf("Task 1");

    expect(idx2).toBeLessThan(idx3);
    expect(idx3).toBeLessThan(idx1);

    // Clean up
    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

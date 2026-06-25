"use client";

import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { cn } from "@/lib/utils";

// Custom ProseMirror plugin to sort checked checklist items to the bottom of their parent list
const AutoSortChecklist = Extension.create({
  name: "autoSortChecklist",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("autoSortChecklist"),
        appendTransaction(transactions, oldState, newState) {
          // Only trigger if document has changed
          if (transactions.length === 0 || !transactions.some(tr => tr.docChanged)) {
            return null;
          }

          const tr = newState.tr;
          let modified = false;

          tr.doc.descendants((node, pos) => {
            if (node.type.name === "taskList") {
              const children: ProseMirrorNode[] = [];
              let checkedCount = 0;
              let outOfOrder = false;

              node.forEach((child) => {
                const isChecked = !!child.attrs.checked;
                children.push(child);
                if (isChecked) {
                  checkedCount++;
                } else {
                  if (checkedCount > 0) {
                    outOfOrder = true;
                  }
                }
              });

              if (outOfOrder) {
                // Sort children: unchecked items first, checked items last
                const sortedChildren = children.slice().sort((a, b) => {
                  const aChecked = !!a.attrs.checked;
                  const bChecked = !!b.attrs.checked;
                  if (aChecked === bChecked) return 0;
                  return aChecked ? 1 : -1;
                });

                const listStart = pos + 1;
                const listEnd = pos + node.nodeSize - 1;
                tr.replaceWith(listStart, listEnd, sortedChildren);
                modified = true;
                return false; // Skip descendants as we modified this node
              }
            }
          });

          return modified ? tr : null;
        }
      })
    ];
  }
});

type FilebucketEditorProps = {
  markdown: string;
  onChange: (markdown: string) => void;
  className?: string;
  autoFocus?: boolean;
  mode?: "notes" | "keep";
  onEditorReady?: (editor: Editor) => void;
  onLinkClick?: (href: string, event: React.MouseEvent) => void;
};

export function FilebucketEditor({
  markdown,
  onChange,
  className,
  autoFocus = false,
  mode = "notes",
  onEditorReady,
  onLinkClick
}: FilebucketEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // starter-kit bulletList and orderedList work natively with taskLists
      }),
      Markdown,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Image.configure({
        allowBase64: true
      }),
      AutoSortChecklist
    ],
    content: markdown,
    // Notify Tiptap that content is Markdown, not HTML
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-slate max-w-none focus:outline-none h-full",
          mode === "keep" ? "keep-editor" : "notes-editor"
        )
      }
    },
    onUpdate: ({ editor }) => {
      // Get output as markdown using storage
      const outputMarkdown = editor.getMarkdown();
      onChangeRef.current(outputMarkdown);
    },
    onCreate: ({ editor }) => {
      if (autoFocus) {
        editor.commands.focus();
      }
      if (onEditorReady) {
        onEditorReady(editor);
      }
    }
  });

  // Sync editor contents with incoming markdown prop (e.g. on note switch)
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentMarkdown = editor.getMarkdown();
      if (markdown !== currentMarkdown) {
        editor.commands.setContent(markdown, { contentType: "markdown" });
      }
    }
  }, [markdown, editor]);

  return (
    <div 
      className={cn("filebucket-editor-container", className)}
      onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest("a");
        if (anchor && onLinkClick) {
          const href = anchor.getAttribute("href");
          if (href) {
            onLinkClick(href, e);
          }
        }
      }}
    >
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
}

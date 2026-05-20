"use client";

import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";

import { updateNoteAction } from "@/app/notes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NoteEditorProps = {
  note: {
    id: string;
    title: string;
    body: string;
  };
};

export function NoteEditor({ note }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [lastSavedBody, setLastSavedBody] = useState(note.body);
  const [lastSavedTitle, setLastSavedTitle] = useState(note.title);
  const [isPending, startTransition] = useTransition();

  const extensions = useMemo(() => [markdown()], []);
  const hasChanges = title !== lastSavedTitle || body !== lastSavedBody;

  const save = useCallback(() => {
    const nextTitle = title.trim() || "Untitled note";

    startTransition(async () => {
      await updateNoteAction(note.id, nextTitle, body);
      setTitle(nextTitle);
      setLastSavedTitle(nextTitle);
      setLastSavedBody(body);
    });
  }, [body, note.id, title]);

  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    const timeout = window.setTimeout(save, 900);

    return () => window.clearTimeout(timeout);
  }, [hasChanges, save]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex min-h-11 flex-col gap-3 border-b px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Note title"
            className="h-auto border-0 px-0 py-0 text-2xl font-semibold tracking-normal shadow-none focus-visible:ring-0"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </div>
        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <span className={cn("text-xs", hasChanges || isPending ? "text-amber-700" : "text-muted-foreground")}>
            {isPending ? "Saving..." : hasChanges ? "Unsaved changes" : "Saved"}
          </span>
          <Button onClick={save} type="button" disabled={isPending || !hasChanges} variant="outline">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="filebucket-note-editor min-h-0 flex-1 overflow-hidden bg-[#1f2128]">
        <CodeMirror
          basicSetup={{
            foldGutter: false,
            highlightActiveLine: false,
            lineNumbers: false,
          }}
          className="h-full text-base"
          extensions={extensions}
          height="100%"
          onChange={setBody}
          theme={oneDark}
          value={body}
        />
      </div>
    </div>
  );
}

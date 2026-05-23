"use client";

import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

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

const AUTOSAVE_DELAY_MS = 20_000;

export function NoteEditor({ note }: NoteEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownNoteEditor note={note} />
    </MilkdownProvider>
  );
}

function MilkdownNoteEditor({ note }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [lastSavedBody, setLastSavedBody] = useState(note.body);
  const [lastSavedTitle, setLastSavedTitle] = useState(note.title);
  const [saveError, setSaveError] = useState("");
  const [isPending, startTransition] = useTransition();
  const titleRef = useRef(note.title);
  const bodyRef = useRef(note.body);
  const savedTitleRef = useRef(note.title);
  const savedBodyRef = useRef(note.body);
  const noteIdRef = useRef(note.id);
  const hasChanges = title !== lastSavedTitle || body !== lastSavedBody;

  const save = useCallback(() => {
    const noteIdSnapshot = noteIdRef.current;
    const titleSnapshot = titleRef.current;
    const bodySnapshot = bodyRef.current;
    const nextTitle = titleSnapshot.trim() || "Untitled note";

    if (nextTitle === savedTitleRef.current && bodySnapshot === savedBodyRef.current) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateNoteAction(noteIdSnapshot, nextTitle, bodySnapshot);

        if (!result.ok) {
          setSaveError(result.error ?? "Could not save changes.");
          return;
        }

        setSaveError("");
        savedTitleRef.current = nextTitle;
        savedBodyRef.current = bodySnapshot;
        setLastSavedTitle(nextTitle);
        setLastSavedBody(bodySnapshot);
      } catch {
        setSaveError("Could not save changes.");
      }
    });
  }, []);

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
    setLastSavedTitle(note.title);
    setLastSavedBody(note.body);
    setSaveError("");
    titleRef.current = note.title;
    bodyRef.current = note.body;
    savedTitleRef.current = note.title;
    savedBodyRef.current = note.body;
    noteIdRef.current = note.id;
  }, [note.body, note.id, note.title]);

  const updateTitle = useCallback((nextTitle: string) => {
    titleRef.current = nextTitle;
    setTitle(nextTitle);
  }, []);

  const updateBody = useCallback((nextBody: string) => {
    bodyRef.current = nextBody;
    setBody(nextBody);
  }, []);

  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    const timeout = window.setTimeout(save, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [body, hasChanges, save, title]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#191c22]">
      <div className="flex min-h-11 flex-col gap-3 border-b border-slate-800 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Note title"
            className="h-auto border-0 bg-transparent px-0 py-0 text-2xl font-semibold tracking-normal text-slate-50 shadow-none focus-visible:ring-0"
            onChange={(event) => updateTitle(event.target.value)}
            value={title}
          />
        </div>
        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <span
            className={cn(
              "text-xs",
              saveError
                ? "text-destructive"
                : isPending
                  ? "text-amber-700"
                  : hasChanges
                    ? "text-amber-700"
                    : "text-slate-400",
            )}
          >
            {saveError ? saveError : isPending ? "Saving..." : hasChanges ? "Unsaved changes" : "Saved"}
          </span>
          <Button onClick={save} type="button" disabled={isPending || !hasChanges} variant="outline">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <CrepeEditor key={note.id} markdown={note.body} onMarkdownChange={updateBody} />
    </div>
  );
}

function CrepeEditor({
  markdown,
  onMarkdownChange,
}: {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
}) {
  useEditor(
    (root) => {
      const crepe = new Crepe({
        root,
        defaultValue: markdown,
        features: {
          [CrepeFeature.TopBar]: false,
          [CrepeFeature.AI]: false,
        },
      });

      crepe.on((listener) => {
        listener.markdownUpdated((_, nextMarkdown) => {
          onMarkdownChange(nextMarkdown);
        });
      });

      return crepe;
    },
    [markdown, onMarkdownChange],
  );

  return (
    <div className="filebucket-crepe min-h-0 flex-1 overflow-y-auto bg-[#191c22]">
      <Milkdown />
    </div>
  );
}

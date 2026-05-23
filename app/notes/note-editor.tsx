"use client";

import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Eye, PenLine, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [saveError, setSaveError] = useState("");
  const [isPending, startTransition] = useTransition();

  const extensions = useMemo(() => [markdown()], []);
  const hasChanges = title !== lastSavedTitle || body !== lastSavedBody;

  const save = useCallback(() => {
    const nextTitle = title.trim() || "Untitled note";

    startTransition(async () => {
      try {
        const result = await updateNoteAction(note.id, nextTitle, body);

        if (!result.ok) {
          setSaveError(result.error ?? "Could not save changes.");
          return;
        }

        setSaveError("");
        setTitle(nextTitle);
        setLastSavedTitle(nextTitle);
        setLastSavedBody(body);
      } catch {
        setSaveError("Could not save changes.");
      }
    });
  }, [body, note.id, title]);

  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    const timeout = window.setTimeout(save, 1800);

    return () => window.clearTimeout(timeout);
  }, [hasChanges, save]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#191c22]">
      <div className="flex min-h-11 flex-col gap-3 border-b border-slate-800 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Note title"
            className="h-auto border-0 bg-transparent px-0 py-0 text-2xl font-semibold tracking-normal text-slate-50 shadow-none focus-visible:ring-0"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </div>
        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <div className="flex items-center rounded-md border border-slate-700 bg-[#111318] p-0.5">
            <Button
              aria-label="Write Markdown"
              onClick={() => setMode("write")}
              size="icon"
              title="Write Markdown"
              type="button"
              variant={mode === "write" ? "secondary" : "ghost"}
            >
              <PenLine className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Preview Markdown"
              onClick={() => setMode("preview")}
              size="icon"
              title="Preview Markdown"
              type="button"
              variant={mode === "preview" ? "secondary" : "ghost"}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          <span
            className={cn(
              "text-xs",
              saveError
                ? "text-destructive"
                : hasChanges || isPending
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

      {mode === "write" ? (
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
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#191c22]">
          <div className="mx-auto max-w-[860px] space-y-4 px-5 py-6 text-base leading-7 text-slate-100 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-700 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-slate-800 [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-50 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-700 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-700 [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc">
            <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
            {body}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

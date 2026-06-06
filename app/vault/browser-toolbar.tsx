"use client";

import { Check, Download, FolderPlus, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { createFolderAction } from "@/app/folders/actions";
import { MediaUploadControl } from "@/app/media/media-upload-control";
import { createNoteAction, importMarkdownNotesAction } from "@/app/notes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BrowserToolbarProps = {
  folderId: string | null;
  disabled?: boolean;
};

export function BrowserToolbar({ folderId, disabled = false }: BrowserToolbarProps) {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const importFormRef = useRef<HTMLFormElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {/* New Note Action */}
        <form action={createNoteAction}>
          <input type="hidden" name="folderId" value={folderId ?? ""} />
          <Button
            aria-label="Create note"
            className="h-9 w-9 border-slate-700 bg-[#1f242c] text-slate-300 hover:bg-slate-800 hover:text-slate-50"
            disabled={disabled}
            size="icon"
            type="submit"
            variant="outline"
            title="New note"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* New Folder Action Toggle */}
        <Button
          aria-label="Create folder"
          className="h-9 w-9 border-slate-700 bg-[#1f242c] text-slate-300 hover:bg-slate-800 hover:text-slate-50"
          disabled={disabled}
          onClick={() => setIsCreatingFolder((prev) => !prev)}
          size="icon"
          type="button"
          variant="outline"
          title="New folder"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>

        {/* Upload Media Action */}
        <MediaUploadControl disabled={disabled} folderId={folderId} />

        {/* Import Notes Action */}
        <form ref={importFormRef} action={importMarkdownNotesAction} className="hidden">
          <input type="hidden" name="folderId" value={folderId ?? ""} />
          <input
            ref={importInputRef}
            accept=".md,text/markdown"
            multiple
            name="files"
            type="file"
            onChange={() => importFormRef.current?.requestSubmit()}
          />
        </form>
        <Button
          aria-label="Import notes"
          className="h-9 w-9 border-slate-700 bg-[#1f242c] text-slate-300 hover:bg-slate-800 hover:text-slate-50"
          disabled={disabled}
          onClick={() => importInputRef.current?.click()}
          size="icon"
          type="button"
          variant="outline"
          title="Import Markdown notes"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Inline Folder Creation Form */}
      {isCreatingFolder && !disabled ? (
        <form
          action={createFolderAction}
          className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#111318] p-1.5"
          onSubmit={() => setIsCreatingFolder(false)}
        >
          <input type="hidden" name="parentId" value={folderId ?? ""} />
          <Input
            autoFocus
            className="h-8 flex-1 border-slate-700 bg-[#171a20] text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-1"
            name="name"
            placeholder="Folder name"
            required
          />
          <Button
            aria-label="Submit folder"
            className="h-8 w-8 border-slate-700 bg-[#1f242c] text-slate-300 hover:bg-slate-800"
            size="icon"
            type="submit"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Cancel folder"
            className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={() => setIsCreatingFolder(false)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
      ) : null}
    </div>
  );
}

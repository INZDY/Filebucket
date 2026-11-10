"use client";

import { HardDriveUpload } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { useUploads } from "@/components/upload-context";

type MediaUploadControlProps = {
  disabled?: boolean;
  folderId?: string | null;
};

export function MediaUploadControl({ disabled, folderId }: MediaUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { enqueue } = useUploads();

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <input
        ref={inputRef}
        accept="image/*,audio/*,video/*,application/pdf,application/epub+zip,text/plain,text/markdown,application/json,.zip,.cbz,.epub,.md,.json"
        className="sr-only"
        disabled={disabled}
        multiple
        onChange={(event) => {
          void enqueue(event.target.files, folderId ?? null);
          event.target.value = "";
        }}
        type="file"
      />
      <Button
        aria-label="Upload media"
        className="border-slate-700 bg-[#1f242c] text-slate-300 hover:bg-slate-800 hover:text-slate-50"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        size="icon"
        title="Upload media"
        type="button"
        variant="outline"
      >
        <HardDriveUpload className="h-4 w-4" />
      </Button>
    </div>
  );
}

"use client";

import { HardDriveUpload, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { useRef, useState } from "react";

import { getPresignedUploadUrlAction, createMediaAssetAction } from "@/app/media/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadState = {
  id: string;
  name: string;
  size: number;
  status: "waiting" | "uploading" | "success" | "error" | "unsupported";
  progress: number;
  error?: string;
  file: File;
};

type MediaUploadControlProps = {
  disabled?: boolean;
  folderId?: string | null;
};

const ACCEPTED_TYPES = [
  "image/",
  "audio/",
  "video/",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-cbz",
];
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

function isAccepted(file: File) {
  const isMimeAccepted = ACCEPTED_TYPES.some((type) => file.type === type || file.type.startsWith(type));
  const isExtensionAccepted = /\.(zip|cbz)$/i.test(file.name);
  return isMimeAccepted || isExtensionAccepted;
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${Math.round(size / 1024 / 1024)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function MediaUploadControl({ disabled, folderId }: MediaUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  function updateUploadStatus(id: string, updates: Partial<UploadState>) {
    setUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  async function performUpload(upload: UploadState) {
    updateUploadStatus(upload.id, { status: "uploading", progress: 0, error: "" });

    try {
      // 1. Get presigned URL from server action
      const { uploadUrl, r2Key } = await getPresignedUploadUrlAction(upload.name, upload.file.type);

      // 2. PUT file blob directly to Cloudflare R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", upload.file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            updateUploadStatus(upload.id, { progress: percent });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network connection error"));
        };

        xhr.send(upload.file);
      });

      // 3. Create MediaAsset metadata in DB
      await createMediaAssetAction({
        filename: upload.name,
        contentType: upload.file.type,
        sizeBytes: upload.size,
        r2Key,
        folderId: folderId ?? null,
      });

      updateUploadStatus(upload.id, { status: "success", progress: 100 });
    } catch (err: unknown) {
      console.error("Upload error:", err);
      updateUploadStatus(upload.id, { status: "error", error: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) {
      return;
    }

    const newUploads = Array.from(files).map((file) => {
      const isOk = isAccepted(file) && file.size <= MAX_SIZE_BYTES;
      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        name: file.name,
        size: file.size,
        status: isOk ? ("waiting" as const) : ("unsupported" as const),
        progress: 0,
        error: isOk
          ? ""
          : file.size > MAX_SIZE_BYTES
          ? "File exceeds 100 MB"
          : "Unsupported file type",
        file,
      };
    });

    setUploads((prev) => [...newUploads, ...prev]);
    setShowDetails(true);

    // Run upload sequence
    for (const upload of newUploads) {
      if (upload.status === "waiting") {
        await performUpload(upload);
      }
    }
  }

  function removeUpload(id: string) {
    setUploads((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <input
        ref={inputRef}
        accept="image/*,audio/*,video/*,application/pdf,text/plain,.zip,.cbz"
        className="sr-only"
        disabled={disabled}
        multiple
        onChange={(event) => handleFiles(event.target.files)}
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

      {uploads.length > 0 ? (
        (() => {
          const totalCount = uploads.length;
          const activeCount = uploads.filter((u) => u.status === "uploading" || u.status === "waiting").length;
          const completedCount = uploads.filter((u) => u.status === "success").length;
          const failedCount = uploads.filter((u) => u.status === "error" || u.status === "unsupported").length;

          const overallProgress = totalCount > 0
            ? Math.round(uploads.reduce((sum, u) => sum + u.progress, 0) / totalCount)
            : 0;

          return (
            <div className="absolute left-3 right-3 top-16 z-30 space-y-2 rounded-md border border-slate-800 bg-[#111318] p-3 text-slate-100 shadow-xl max-w-sm">
              {/* Summary Header */}
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-slate-200 truncate">
                    {activeCount > 0
                      ? `Uploading: ${completedCount}/${totalCount} files`
                      : `Uploads complete (${completedCount} success, ${failedCount} failed)`}
                  </span>
                  {activeCount > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {overallProgress}% overall
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    onClick={() => setShowDetails((d) => !d)}
                    type="button"
                    title={showDetails ? "Hide details" : "Show details"}
                  >
                    {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    className="h-5 w-5 p-0 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    onClick={() => {
                      setUploads([]);
                      setShowDetails(false);
                    }}
                    size="icon"
                    variant="ghost"
                    type="button"
                    title="Clear uploads"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Overall Progress Bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    activeCount > 0 ? "bg-purple-500 animate-pulse" : failedCount > 0 ? "bg-amber-500" : "bg-teal-500"
                  )}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              {/* Detail list of files */}
              {showDetails && (
                <div className="max-h-48 overflow-y-auto space-y-2 pt-1 border-t border-slate-800/80 mt-2">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="relative text-xs py-1">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate font-medium text-slate-200 max-w-[200px]" title={upload.name}>
                          {upload.name}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {formatSize(upload.size)}
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            upload.status === "success" && "bg-teal-500 w-full",
                            upload.status === "uploading" && "bg-blue-500",
                            upload.status === "error" && "bg-rose-500 w-full",
                            upload.status === "unsupported" && "bg-rose-500 w-full",
                            upload.status === "waiting" && "bg-amber-500 w-1/12"
                          )}
                          style={upload.status === "uploading" ? { width: `${upload.progress}%` } : undefined}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                        <span
                          className={cn(
                            upload.status === "success" && "text-teal-400",
                            upload.status === "uploading" && "text-blue-400",
                            upload.status === "error" && "text-rose-400",
                            upload.status === "unsupported" && "text-rose-400",
                            upload.status === "waiting" && "text-amber-400"
                          )}
                        >
                          {upload.status === "uploading" && `Uploading ${upload.progress}%`}
                          {upload.status === "success" && "Upload completed"}
                          {upload.status === "error" && (upload.error || "Upload failed")}
                          {upload.status === "unsupported" && (upload.error || "Unsupported")}
                          {upload.status === "waiting" && "Queued..."}
                        </span>
                        <div className="flex gap-1">
                          {upload.status === "error" ? (
                            <Button
                              aria-label="Retry upload"
                              className="h-4 w-4 p-0 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                              onClick={() => performUpload(upload)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <RefreshCw className="h-2.5 w-2.5" />
                            </Button>
                          ) : null}
                          <Button
                            aria-label="Remove upload item"
                            className="h-4 w-4 p-0 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                            onClick={() => removeUpload(upload.id)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()
      ) : null}
    </div>
  );
}

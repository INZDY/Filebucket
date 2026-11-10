"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUploads } from "@/components/upload-context";
import { cn, formatBytes } from "@/lib/utils";

/**
 * App-shell upload tray (Drive/Dropbox pattern): fixed to the bottom corner,
 * survives navigation, collapses to a summary row.
 */
export function UploadTray() {
  const { uploads, retry, remove, clear } = useUploads();
  const [expanded, setExpanded] = useState(false);

  if (uploads.length === 0) {
    return null;
  }

  const totalCount = uploads.length;
  const activeCount = uploads.filter((item) => item.status === "uploading" || item.status === "waiting").length;
  const completedCount = uploads.filter((item) => item.status === "success").length;
  const failedCount = uploads.filter((item) => item.status === "error" || item.status === "unsupported").length;
  const overallProgress = Math.round(uploads.reduce((sum, item) => sum + item.progress, 0) / totalCount);

  return (
    <div
      aria-label="Upload progress"
      className="fixed bottom-16 right-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] space-y-2 rounded-lg border border-slate-800 bg-[#111318] p-3 text-slate-100 shadow-2xl md:bottom-4 md:right-4"
      role="region"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <UploadCloud className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span aria-live="polite" className="truncate font-semibold text-slate-200">
              {activeCount > 0
                ? `Uploading: ${completedCount}/${totalCount} files`
                : failedCount > 0
                  ? `${failedCount} upload${failedCount === 1 ? "" : "s"} failed`
                  : "Uploads complete"}
            </span>
            {activeCount > 0 && <span className="text-[10px] text-slate-400">{overallProgress}% overall</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label={expanded ? "Collapse upload list" : "Expand upload list"}
            className="h-5 w-5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            onClick={() => setExpanded((value) => !value)}
            size="icon"
            title={expanded ? "Collapse" : "Expand"}
            type="button"
            variant="ghost"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          <Button
            aria-label="Clear uploads"
            className="h-5 w-5 p-0 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={clear}
            size="icon"
            title="Clear uploads"
            type="button"
            variant="ghost"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            activeCount > 0 ? "bg-blue-500" : failedCount > 0 ? "bg-amber-500" : "bg-teal-500"
          )}
          style={{
            width: `${overallProgress}%`,
            animation: activeCount > 0 ? "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" : undefined,
          }}
        />
      </div>

      {expanded && (
        <div className="max-h-48 space-y-2 overflow-y-auto border-t border-slate-800/80 pt-1">
          {uploads.map((upload) => (
            <div className="relative py-1 text-xs" key={upload.id}>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="max-w-[200px] truncate font-medium text-slate-200" title={upload.name}>
                  {upload.name}
                </span>
                <span className="shrink-0 text-[10px] text-slate-500">{formatBytes(upload.size, 1)}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    upload.status === "success" && "w-full bg-teal-500",
                    upload.status === "uploading" && "bg-blue-500",
                    upload.status === "error" && "w-full bg-rose-500",
                    upload.status === "unsupported" && "w-full bg-rose-500",
                    upload.status === "waiting" && "w-1/12 bg-amber-500"
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
                  {upload.status === "error" || upload.status === "unsupported" ? (
                    <Button
                      aria-label={`Retry ${upload.name}`}
                      className="h-4 w-4 p-0 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                      onClick={() => retry(upload.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                    </Button>
                  ) : null}
                  <Button
                    aria-label={`Remove ${upload.name}`}
                    className="h-4 w-4 p-0 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                    onClick={() => remove(upload.id)}
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
}

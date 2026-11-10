"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getPresignedUploadUrlAction, createMediaAssetAction } from "@/app/media/actions";

export type UploadStatus = "waiting" | "uploading" | "success" | "error" | "unsupported";

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  file: File;
  folderId: string | null;
};

type UploadContextValue = {
  uploads: UploadItem[];
  enqueue: (files: FileList | null, folderId: string | null) => Promise<void>;
  retry: (id: string) => Promise<void>;
  remove: (id: string) => void;
  clear: () => void;
};

const ACCEPTED_TYPES = [
  "image/",
  "audio/",
  "video/",
  "application/pdf",
  "application/epub+zip",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-cbz",
];
const MAX_SIZE_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
const AUTO_DISMISS_MS = 3000;

function isAccepted(file: File) {
  const isMimeAccepted = ACCEPTED_TYPES.some((type) => file.type === type || file.type.startsWith(type));
  const isExtensionAccepted = /\.(zip|cbz|epub|md|json)$/i.test(file.name);
  return isMimeAccepted || isExtensionAccepted;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const updateUploadStatus = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const performUpload = useCallback(
    async (upload: UploadItem) => {
      updateUploadStatus(upload.id, { status: "uploading", progress: 0, error: "" });

      try {
        // 1. Extract cover thumbnail if supported
        let thumbnailKey: string | null = null;
        try {
          const { extractCoverThumbnail } = await import("@/lib/thumbnails");
          const thumbnailBlob = await extractCoverThumbnail(upload.file);
          if (thumbnailBlob) {
            const thumbnailFilename = `${upload.name}_thumbnail.png`;
            const { uploadUrl: thumbUploadUrl, r2Key: thumbR2Key } = await getPresignedUploadUrlAction(
              thumbnailFilename,
              "image/png"
            );

            // Upload thumbnail blob directly to R2
            const thumbRes = await fetch(thumbUploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": "image/png",
              },
              body: thumbnailBlob,
            });

            if (!thumbRes.ok) {
              console.warn(`Thumbnail upload failed with status ${thumbRes.status}`);
            } else {
              thumbnailKey = thumbR2Key;
            }
          }
        } catch (thumbErr) {
          console.error("Failed to extract or upload cover thumbnail:", thumbErr);
        }

        // 2. Get presigned URL for the main file from server action
        const { uploadUrl, r2Key } = await getPresignedUploadUrlAction(upload.name, upload.file.type);

        // 3. PUT main file blob directly to Cloudflare R2
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

        // 4. Create MediaAsset metadata in DB (including thumbnailKey)
        const createdAsset = await createMediaAssetAction({
          filename: upload.name,
          contentType: upload.file.type,
          sizeBytes: upload.size,
          r2Key,
          thumbnailKey,
          folderId: upload.folderId,
        });

        if (createdAsset) {
          window.dispatchEvent(
            new CustomEvent("vault-mutate", {
              detail: {
                type: "create-media",
                mediaAsset: createdAsset,
              },
            })
          );
        }

        updateUploadStatus(upload.id, { status: "success", progress: 100 });
        return true;
      } catch (err: unknown) {
        console.error("Upload error:", err);
        updateUploadStatus(upload.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
        return false;
      }
    },
    [updateUploadStatus]
  );

  const enqueue = useCallback(
    async (files: FileList | null, folderId: string | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const newUploads: UploadItem[] = Array.from(files).map((file) => {
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
              ? "File exceeds 4 GB"
              : "Unsupported file type",
          file,
          folderId,
        };
      });

      setUploads((prev) => [...newUploads, ...prev]);

      for (const upload of newUploads) {
        if (upload.status === "waiting") {
          await performUpload(upload);
        }
      }
    },
    [performUpload]
  );

  const retry = useCallback(
    async (id: string) => {
      const upload = uploads.find((item) => item.id === id);
      if (upload) {
        await performUpload(upload);
      }
    },
    [uploads, performUpload]
  );

  const remove = useCallback((id: string) => {
    setUploads((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setUploads([]);
  }, []);

  // Fade the tray away once everything succeeded; failures stay until dismissed.
  useEffect(() => {
    if (uploads.length === 0) {
      return;
    }
    const allSucceeded = uploads.every((item) => item.status === "success");
    if (!allSucceeded) {
      return;
    }
    const timer = setTimeout(() => setUploads([]), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [uploads]);

  return (
    <UploadContext.Provider value={{ uploads, enqueue, retry, remove, clear }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploads() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUploads must be used within an UploadProvider");
  }
  return context;
}

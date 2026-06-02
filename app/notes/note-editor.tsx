"use client";

import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { ImagePlus, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { updateNoteAction } from "@/app/notes/actions";
import { getPresignedUploadUrlAction, createMediaAssetAction } from "@/app/media/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NoteEditorProps = {
  note: {
    id: string;
    title: string;
    body: string;
  };
  imageMediaAssets: {
    id: string;
    filename: string;
    location: string;
    url: string;
  }[];
};

const AUTOSAVE_DELAY_MS = 20_000;

export function NoteEditor({ imageMediaAssets, note }: NoteEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownNoteEditor imageMediaAssets={imageMediaAssets} note={note} />
    </MilkdownProvider>
  );
}

function MilkdownNoteEditor({ imageMediaAssets, note }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [lastSavedBody, setLastSavedBody] = useState(note.body);
  const [lastSavedTitle, setLastSavedTitle] = useState(note.title);
  const [saveError, setSaveError] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const titleRef = useRef(note.title);
  const bodyRef = useRef(note.body);
  const savedTitleRef = useRef(note.title);
  const savedBodyRef = useRef(note.body);
  const noteIdRef = useRef(note.id);
  const hasChanges = title !== lastSavedTitle || body !== lastSavedBody;

  // Maintain local mediaAssets state to include newly uploaded images dynamically
  const [mediaAssets, setMediaAssets] = useState(imageMediaAssets);

  useEffect(() => {
    setMediaAssets(imageMediaAssets);
  }, [imageMediaAssets]);

  // Translate database filebucket-media:id to public URLs
  const resolveMediaUrls = useCallback((markdown: string, assets = mediaAssets) => {
    return markdown.replace(/filebucket-media:([a-zA-Z0-9]+)/g, (match, mediaId) => {
      const asset = assets.find((a) => a.id === mediaId);
      return asset ? asset.url : match;
    });
  }, [mediaAssets]);

  // Translate public URLs back to database filebucket-media:id
  const restoreMediaUrls = useCallback((markdown: string, assets = mediaAssets) => {
    let result = markdown;
    for (const asset of assets) {
      if (asset.url) {
        const escapedUrl = asset.url.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        result = result.replace(new RegExp(escapedUrl, "g"), `filebucket-media:${asset.id}`);
      }
    }
    return result;
  }, [mediaAssets]);

  const [editorInitialMarkdown, setEditorInitialMarkdown] = useState(() => resolveMediaUrls(note.body));
  const [editorRevision, setEditorRevision] = useState(0);

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
    setShowImagePicker(false);
    setEditorInitialMarkdown(resolveMediaUrls(note.body));
    titleRef.current = note.title;
    bodyRef.current = note.body;
    savedTitleRef.current = note.title;
    savedBodyRef.current = note.body;
    noteIdRef.current = note.id;
  }, [note.body, note.id, note.title, resolveMediaUrls]);

  const updateTitle = useCallback((nextTitle: string) => {
    titleRef.current = nextTitle;
    setTitle(nextTitle);
  }, []);

  const updateBody = useCallback((nextBody: string) => {
    const dbBody = restoreMediaUrls(nextBody);
    bodyRef.current = dbBody;
    setBody(dbBody);
  }, [restoreMediaUrls]);

  function insertImageReference(
    mediaAsset: NoteEditorProps["imageMediaAssets"][number],
    customAssets?: NoteEditorProps["imageMediaAssets"]
  ) {
    const assetsList = customAssets || mediaAssets;
    const editorBody = resolveMediaUrls(bodyRef.current, assetsList);
    const trimmedBody = editorBody.trimEnd();
    const imageMarkdown = `![${mediaAsset.filename}](${mediaAsset.url})`;
    const nextEditorBody = trimmedBody ? `${trimmedBody}\n\n${imageMarkdown}\n` : `${imageMarkdown}\n`;

    const nextDbBody = restoreMediaUrls(nextEditorBody, assetsList);
    bodyRef.current = nextDbBody;
    setBody(nextDbBody);

    setEditorInitialMarkdown(nextEditorBody);
    setEditorRevision((currentRevision) => currentRevision + 1);
    setShowImagePicker(false);
  }

  async function handleInlineImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Only images are supported for inline insertion.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setSaveError("Image file exceeds 100 MB limit.");
      return;
    }

    setSaveError("Uploading image...");

    try {
      const { uploadUrl, r2Key } = await getPresignedUploadUrlAction(file.name, file.type);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Network connection error"));
        xhr.send(file);
      });

      const result = await createMediaAssetAction({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        r2Key,
        folderId: null,
        useAssetsFolder: true,
      });

      const newAsset = {
        id: result.id,
        filename: result.filename,
        location: "Assets",
        url: result.url!,
      };

      const updatedAssets = [...mediaAssets, newAsset];
      setMediaAssets(updatedAssets);
      insertImageReference(newAsset, updatedAssets);

      setSaveError("");
    } catch (err: unknown) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : "Failed to upload image");
    }
  }

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
        <div className="relative flex items-center justify-between gap-3 xl:justify-end">
          <Button
            aria-expanded={showImagePicker}
            aria-haspopup="menu"
            onClick={() => setShowImagePicker((current) => !current)}
            type="button"
            variant="outline"
          >
            <ImagePlus className="h-4 w-4" />
            Insert image
          </Button>
          {showImagePicker ? (
            <div className="absolute right-0 top-11 z-40 w-72 rounded-md border border-slate-700 bg-[#1b1f27] p-2 text-slate-100 shadow-lg">
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {imageMediaAssets.length > 0 ? (
                  imageMediaAssets.map((mediaAsset) => (
                    <Button
                      key={mediaAsset.id}
                      className="h-auto w-full justify-start px-2 py-2 text-left"
                      onClick={() => insertImageReference(mediaAsset)}
                      type="button"
                      variant="ghost"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{mediaAsset.filename}</span>
                        <span className="block truncate text-xs text-slate-500">{mediaAsset.location}</span>
                      </span>
                    </Button>
                  ))
                ) : (
                  <p className="px-2 py-4 text-sm text-slate-500">No image media assets</p>
                )}
              </div>
              <label className="mt-2 block rounded-md border border-dashed border-slate-700 px-3 py-2 text-center text-xs text-slate-400">
                Upload new image
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={handleInlineImageUpload}
                  type="file"
                />
              </label>
            </div>
          ) : null}
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

      <CrepeEditor
        key={`${note.id}:${editorRevision}`}
        markdown={editorInitialMarkdown}
        onMarkdownChange={updateBody}
      />
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

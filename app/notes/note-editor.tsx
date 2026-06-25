"use client";

import { ImagePlus, Save, Plus, Tag } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Editor } from "@tiptap/react";

const FilebucketEditor = dynamic(
  () => import("@/components/filebucket-editor").then((mod) => mod.FilebucketEditor),
  { ssr: false }
);

import { updateNoteAction } from "@/app/notes/actions";
import { getPresignedUploadUrlAction, createMediaAssetAction } from "@/app/media/actions";
import { toggleNoteTagAction, createTagAction } from "@/app/tags/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NoteEditorProps = {
  note: {
    id: string;
    title: string;
    body: string;
  };
  updatedAt?: Date;
  imageMediaAssets: {
    id: string;
    filename: string;
    location: string;
    url: string;
    folderId: string | null;
  }[];
  allTags: {
    id: string;
    name: string;
    slug: string;
  }[];
  assignedTags: {
    id: string;
    name: string;
    slug: string;
  }[];
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

const AUTOSAVE_DELAY_MS = 20_000;

export function NoteEditor({ imageMediaAssets, note, updatedAt, allTags, assignedTags }: NoteEditorProps) {
  return (
    <MilkdownNoteEditor
      imageMediaAssets={imageMediaAssets}
      note={note}
      updatedAt={updatedAt}
      allTags={allTags}
      assignedTags={assignedTags}
    />
  );
}

function MilkdownNoteEditor({ imageMediaAssets, note, updatedAt, allTags, assignedTags }: NoteEditorProps) {
  const router = useRouter();

  const handleLinkClick = useCallback((href: string, event: React.MouseEvent) => {
    const matchingAsset = imageMediaAssets.find(
      (asset) => asset.url === href || href.includes(asset.id)
    );

    if (matchingAsset) {
      event.preventDefault();
      event.stopPropagation();

      const targetHref = matchingAsset.folderId
        ? `/?folder=${matchingAsset.folderId}&media=${matchingAsset.id}`
        : `/?media=${matchingAsset.id}`;
      router.push(targetHref);
    }
  }, [imageMediaAssets, router]);
  const [mediaAssets, setMediaAssets] = useState(imageMediaAssets);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagQuery, setTagQuery] = useState("");

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

  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(() => restoreMediaUrls(note.body, imageMediaAssets));
  const [lastSavedBody, setLastSavedBody] = useState(() => restoreMediaUrls(note.body, imageMediaAssets));
  const [lastSavedTitle, setLastSavedTitle] = useState(note.title);
  const [saveError, setSaveError] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  const titleRef = useRef(note.title);
  const bodyRef = useRef(restoreMediaUrls(note.body, imageMediaAssets));
  const savedTitleRef = useRef(note.title);
  const savedBodyRef = useRef(restoreMediaUrls(note.body, imageMediaAssets));
  const noteIdRef = useRef(note.id);
  const hasChanges = title !== lastSavedTitle || body !== lastSavedBody;

  const editorRef = useRef<Editor | null>(null);

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
    const dbBody = restoreMediaUrls(note.body);
    setTitle(note.title);
    setBody(dbBody);
    setLastSavedTitle(note.title);
    setLastSavedBody(dbBody);
    setSaveError("");
    setShowImagePicker(false);
    titleRef.current = note.title;
    bodyRef.current = dbBody;
    savedTitleRef.current = note.title;
    savedBodyRef.current = dbBody;
    noteIdRef.current = note.id;
  }, [note.body, note.id, note.title, resolveMediaUrls, restoreMediaUrls]);

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
    mediaAsset: NoteEditorProps["imageMediaAssets"][number]
  ) {
    if (editorRef.current) {
      editorRef.current.commands.focus();
      editorRef.current.commands.setImage({
        src: mediaAsset.url,
        alt: mediaAsset.filename
      });
    }
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
        folderId: result.folderId,
      };

      const updatedAssets = [...mediaAssets, newAsset];
      setMediaAssets(updatedAssets);
      insertImageReference(newAsset);

      setSaveError("");
    } catch (err: unknown) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : "Failed to upload image");
    }
  }

  // Tag interactions
  async function handleAddTag(tagId: string) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("noteId", note.id);
        formData.append("tagId", tagId);
        formData.append("returnTo", "/");
        await toggleNoteTagAction(formData);
      } catch (err) {
        console.error("Failed to add tag", err);
      }
    });
  }

  async function handleRemoveTag(tagId: string) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("noteId", note.id);
        formData.append("tagId", tagId);
        formData.append("returnTo", "/");
        await toggleNoteTagAction(formData);
      } catch (err) {
        console.error("Failed to remove tag", err);
      }
    });
  }

  async function handleCreateTag(tagName: string) {
    if (!tagName.trim()) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("name", tagName.slice(0, 80));
        formData.append("noteId", note.id);
        formData.append("returnTo", "/");
        await createTagAction(formData);
        setTagQuery("");
        setShowTagDropdown(false);
      } catch (err) {
        console.error("Failed to create tag", err);
      }
    });
  }

  useEffect(() => {
    if (!showTagDropdown) return;
    function handleOutsideClick() {
      setShowTagDropdown(false);
    }
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [showTagDropdown]);

  const filteredAvailableTags = allTags.filter(
    (t) =>
      !assignedTags.some((at) => at.id === t.id) &&
      t.name.toLowerCase().includes(tagQuery.toLowerCase())
  );

  useEffect(() => {
    const timeout = window.setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [body, hasChanges, save, title]);

  const unmountSaveRef = useRef({
    noteId: note.id,
    titleRef,
    bodyRef,
    savedTitleRef,
    savedBodyRef,
  });

  useEffect(() => {
    unmountSaveRef.current.noteId = note.id;
  }, [note.id]);

  useEffect(() => {
    const saveRef = unmountSaveRef.current;
    return () => {
      const { noteId, titleRef: tRef, bodyRef: bRef, savedTitleRef: sTitleRef, savedBodyRef: sBodyRef } = saveRef;
      const currentTitle = tRef.current.trim() || "Untitled note";
      const currentBody = bRef.current;

      if (currentTitle !== sTitleRef.current || currentBody !== sBodyRef.current) {
        updateNoteAction(noteId, currentTitle, currentBody).catch((err) => {
          console.error("Failed to autosave note on unmount:", err);
        });
      }
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0d0d11]">
      {/* Editor Header panel */}
      <div className="flex min-h-12 flex-col gap-3 border-b border-slate-800/40 bg-[#101015]/40 backdrop-blur-md px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Note title"
            className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-bold tracking-tight text-slate-100 shadow-none focus-visible:ring-0 placeholder:text-slate-500"
            onChange={(event) => updateTitle(event.target.value)}
            value={title}
          />
          
          {/* Note tags pills bar */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {assignedTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-600/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium"
              >
                <span>#{tag.name}</span>
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="text-purple-400 hover:text-purple-200 transition-colors ml-1 font-bold text-[10px]"
                  type="button"
                >
                  &times;
                </button>
              </div>
            ))}
            
            {/* Add tag button with autocomplete dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                onClick={() => setShowTagDropdown((prev) => !prev)}
                className="flex h-5 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-[10px] px-2 py-0"
                type="button"
                variant="ghost"
              >
                <Tag className="h-2.5 w-2.5 mr-1" />
                Add tag
              </Button>
              {showTagDropdown && (
                <div className="absolute left-0 top-6 z-40 w-56 rounded-md border border-slate-800/80 bg-[#14141a]/95 backdrop-blur-md p-1 text-slate-100 shadow-xl glass-panel">
                  <div className="p-1">
                    <input
                      type="text"
                      placeholder="Search or create tag..."
                      className="w-full h-8 px-2 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 mb-1"
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tagQuery.trim()) {
                          e.preventDefault();
                          handleCreateTag(tagQuery.trim());
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 p-1">
                    {filteredAvailableTags.length > 0 ? (
                      filteredAvailableTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className="w-full h-8 px-2 rounded hover:bg-purple-600/15 text-left text-xs text-slate-300 hover:text-purple-200 transition-colors flex items-center gap-1.5"
                          onClick={() => handleAddTag(tag.id)}
                        >
                          <Tag className="h-3 w-3 text-slate-500" />
                          <span>{tag.name}</span>
                        </button>
                      ))
                    ) : tagQuery.trim() ? (
                      <button
                        type="button"
                        className="w-full h-8 px-2 rounded hover:bg-purple-600/15 text-left text-xs text-purple-400 font-semibold transition-colors"
                        onClick={() => handleCreateTag(tagQuery.trim())}
                      >
                        <Plus className="h-3 w-3 inline mr-1" />
                        Create tag &quot;{tagQuery.trim()}&quot;
                      </button>
                    ) : (
                      <p className="px-2 py-3 text-[11px] text-slate-500 text-center">No other tags</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-3 xl:justify-end shrink-0">
          <Button
            aria-expanded={showImagePicker}
            aria-haspopup="menu"
            onClick={() => setShowImagePicker((current) => !current)}
            type="button"
            variant="outline"
            className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-900"
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Insert image
          </Button>
          {showImagePicker ? (
            <div className="absolute right-0 top-11 z-40 w-72 rounded-md border border-slate-800/85 bg-[#14141a]/95 backdrop-blur-md p-2 text-slate-100 shadow-xl glass-panel">
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
                  <p className="px-2 py-4 text-xs text-slate-500 text-center">No image media assets</p>
                )}
              </div>
              <label className="mt-2 block rounded-md border border-dashed border-slate-800 px-3 py-2 text-center text-xs text-slate-400 cursor-pointer hover:bg-slate-900/60 transition-colors">
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
              "text-[11px]",
              saveError
                ? "text-destructive"
                : isPending
                  ? "text-amber-500/80"
                  : hasChanges
                    ? "text-amber-500/80"
                    : "text-slate-500",
            )}
          >
            {saveError ? saveError : isPending ? "Saving..." : hasChanges ? "Unsaved changes" : (updatedAt ? `Saved · Last updated ${formatDate(updatedAt)}` : "Saved")}
          </span>
          <Button 
            onClick={save} 
            type="button" 
            disabled={isPending || !hasChanges} 
            variant="outline"
            className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-900"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <FilebucketEditor
        markdown={resolveMediaUrls(body)}
        onChange={updateBody}
        onLinkClick={handleLinkClick}
        mode="notes"
        className="filebucket-crepe min-h-0 flex-1 overflow-y-auto bg-[#0d0d11]"
        onEditorReady={(editor) => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
}

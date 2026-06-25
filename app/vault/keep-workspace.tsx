"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { 
  Pin, 
  CheckSquare, 
  Palette, 
  Tag, 
  Trash2, 
  Plus, 
  Check
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  createKeepNoteAction, 
  updateKeepNoteAction, 
  trashKeepNoteAction 
} from "@/app/notes/actions";
import { toggleNoteTagAction, createTagAction } from "@/app/tags/actions";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { Editor } from "@tiptap/react";

const FilebucketEditor = dynamic(
  () => import("@/components/filebucket-editor").then((mod) => mod.FilebucketEditor),
  { ssr: false }
);

function toggleMarkdownCheckbox(body: string, checkboxIndex: number, checked: boolean): string {
  let count = 0;
  const lines = body.split("\n");
  const updatedLines = lines.map((line) => {
    const match = /^(\s*-\s*\[)( |x|X)(\]\s*.*)$/.exec(line);
    if (match) {
      if (count === checkboxIndex) {
        const replacement = checked ? "x" : " ";
        count++;
        return `${match[1]}${replacement}${match[3]}`;
      }
      count++;
    }
    return line;
  });
  return updatedLines.join("\n");
}

interface NoteTagAssociation {
  tag: {
    id: string;
    name: string;
    slug: string;
  };
}

interface KeepNote {
  id: string;
  title: string;
  body: string;
  color: string | null;
  isPinned: boolean;
  updatedAt: Date;
  tags: NoteTagAssociation[];
}

interface KeepWorkspaceProps {
  notes: KeepNote[];
  keepRootId: string;
  allTags: { id: string; name: string; slug: string }[];
  activeTagSlug?: string;
  query?: string;
}

const COLOR_OPTIONS = [
  { name: "default", bgClass: "bg-[#16171d]/60", borderClass: "border-slate-800/80 hover:border-slate-700", hex: null, label: "Default" },
  { name: "red", bgClass: "bg-rose-500/10", borderClass: "border-rose-500/30 hover:border-rose-500/50", hex: "red", label: "Red" },
  { name: "orange", bgClass: "bg-orange-500/10", borderClass: "border-orange-500/30 hover:border-orange-500/50", hex: "orange", label: "Orange" },
  { name: "yellow", bgClass: "bg-yellow-500/10", borderClass: "border-yellow-500/30 hover:border-yellow-500/50", hex: "yellow", label: "Yellow" },
  { name: "green", bgClass: "bg-green-500/10", borderClass: "border-green-500/30 hover:border-green-500/50", hex: "green", label: "Green" },
  { name: "teal", bgClass: "bg-teal-500/10", borderClass: "border-teal-500/30 hover:border-teal-500/50", hex: "teal", label: "Teal" },
  { name: "blue", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/30 hover:border-blue-500/50", hex: "blue", label: "Blue" },
  { name: "indigo", bgClass: "bg-indigo-500/10", borderClass: "border-indigo-500/30 hover:border-indigo-500/50", hex: "indigo", label: "Dark Blue" },
  { name: "purple", bgClass: "bg-purple-500/10", borderClass: "border-purple-500/30 hover:border-purple-500/50", hex: "purple", label: "Purple" },
  { name: "pink", bgClass: "bg-pink-500/10", borderClass: "border-pink-500/30 hover:border-pink-500/50", hex: "pink", label: "Pink" },
];

export function KeepWorkspace({ notes, keepRootId, allTags }: KeepWorkspaceProps) {
  
  
  // Filter and Sort Notes by Pinned vs Others and chronologically (updatedAt desc)
  const sortedNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const pinnedNotes = sortedNotes.filter((n) => n.isPinned);
  const otherNotes = sortedNotes.filter((n) => !n.isPinned);

  // States
  const [editingNote, setEditingNote] = useState<KeepNote | null>(null);
  
  // Inline Creation Bar state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newNoteColor, setNewNoteColor] = useState<string | null>(null);
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [showColorPickerForCreation, setShowColorPickerForCreation] = useState(false);
  const creationEditorRef = useRef<Editor | null>(null);

  const creationContainerRef = useRef<HTMLDivElement>(null);

  // Close creation bar and save
  const closeAndSaveCreation = useCallback(async () => {
    if (!newTitle.trim() && !newBody.trim()) {
      setIsCreating(false);
      return;
    }

    const data = {
      folderId: keepRootId,
      title: newTitle.trim() || "Untitled note",
      body: newBody,
      color: newNoteColor,
      isPinned: newNotePinned
    };

    setIsCreating(false);
    setNewTitle("");
    setNewBody("");
    setNewNoteColor(null);
    setNewNotePinned(false);

    await createKeepNoteAction(data);
  }, [newTitle, newBody, newNoteColor, newNotePinned, keepRootId]);

  // Click outside creation bar listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        creationContainerRef.current && 
        !creationContainerRef.current.contains(event.target as Node)
      ) {
        closeAndSaveCreation();
      }
    }
    if (isCreating) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCreating, closeAndSaveCreation]);

  // Toggle Pinned status instantly
  async function togglePin(note: KeepNote) {
    const updatedStatus = !note.isPinned;
    // Update optimistically if needed, or trigger save
    await updateKeepNoteAction(note.id, { isPinned: updatedStatus });
  }

  // Update Color instantly
  async function updateColor(noteId: string, color: string | null) {
    await updateKeepNoteAction(noteId, { color });
  }

  // Trash Note instantly
  async function trashNote(noteId: string) {
    if (editingNote?.id === noteId) {
      setEditingNote(null);
    }
    await trashKeepNoteAction(noteId);
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-6 md:px-8 space-y-8 bg-[#0a0a0d] text-slate-100 pb-16">
      
      {/* 1. Inline Creation Bar */}
      <div ref={creationContainerRef} className="max-w-xl mx-auto w-full">
        {!isCreating ? (
          // Collapsed Bar
          <div 
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800/80 bg-[#14151b]/80 backdrop-blur-md cursor-text hover:border-slate-700/80 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
          >
            <span className="text-sm text-slate-400 font-medium select-none">Take a note...</span>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                onClick={() => {
                  setNewBody("- [ ] ");
                  setIsCreating(true);
                }}
                title="New list"
              >
                <CheckSquare className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
        ) : (
          // Expanded Bar
          <div className={cn(
            "rounded-xl border p-4 bg-[#14151b] shadow-2xl transition-all space-y-3",
            COLOR_OPTIONS.find(o => o.hex === newNoteColor)?.borderClass || "border-slate-800"
          )}>
            <div className="flex items-center justify-between gap-2">
              <Input
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="border-0 bg-transparent px-0 text-base font-bold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-8 w-8 shrink-0 hover:bg-slate-800/50 transition-colors", 
                  newNotePinned ? "text-amber-500" : "text-slate-400 hover:text-slate-200"
                )}
                onClick={() => setNewNotePinned(!newNotePinned)}
              >
                <Pin className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* Note Content Input */}
            <FilebucketEditor
              markdown={newBody}
              onChange={setNewBody}
              mode="keep"
              className="w-full text-sm leading-relaxed"
              onEditorReady={(editor) => {
                creationEditorRef.current = editor;
              }}
              autoFocus
            />

            {/* Creation Footer */}
            <div className="flex items-center justify-between border-t border-slate-800/40 pt-3 relative">
              <div className="flex items-center gap-1.5">
                {/* Color Button */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                    onClick={() => setShowColorPickerForCreation(!showColorPickerForCreation)}
                    title="Change color"
                  >
                    <Palette className="h-4.5 w-4.5" />
                  </Button>
                  {showColorPickerForCreation && (
                    <div className="absolute left-0 bottom-10 z-50 flex items-center gap-1 p-1.5 rounded-lg border border-slate-800 bg-[#16171d] shadow-xl">
                      {COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.name}
                          type="button"
                          className={cn(
                            "h-5 w-5 rounded-full border border-slate-700/60",
                            option.bgClass,
                            newNoteColor === option.hex && "ring-1 ring-amber-500"
                          )}
                          title={option.label}
                          onClick={() => {
                            setNewNoteColor(option.hex);
                            setShowColorPickerForCreation(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                  onClick={() => {
                    if (creationEditorRef.current) {
                      creationEditorRef.current.commands.toggleTaskList();
                    }
                  }}
                  title="Toggle checklist"
                >
                  <CheckSquare className="h-4.5 w-4.5" />
                </Button>
              </div>

              <Button
                size="sm"
                className="bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-800 hover:border-slate-700"
                onClick={closeAndSaveCreation}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Masonry Grid Section */}
      <div className="space-y-8 max-w-7xl mx-auto w-full">
        {/* PINNED SECTION */}
        {pinnedNotes.length > 0 && (
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1">Pinned</span>
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 [column-fill:_balance] w-full">
              {pinnedNotes.map((note) => (
                <KeepCard 
                  key={note.id} 
                  note={note} 
                  onEdit={setEditingNote}
                  onPin={togglePin}
                  onColorChange={updateColor}
                  onDelete={trashNote}
                />
              ))}
            </div>
          </div>
        )}

        {/* OTHERS SECTION */}
        <div className="space-y-3">
          {pinnedNotes.length > 0 && otherNotes.length > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1">Others</span>
          )}
          {otherNotes.length > 0 ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 [column-fill:_balance] w-full">
              {otherNotes.map((note) => (
                <KeepCard 
                  key={note.id} 
                  note={note} 
                  onEdit={setEditingNote}
                  onPin={togglePin}
                  onColorChange={updateColor}
                  onDelete={trashNote}
                />
              ))}
            </div>
          ) : (
            pinnedNotes.length === 0 && (
              <div className="text-center py-20 text-slate-500 text-sm">
                No quick notes yet.
              </div>
            )
          )}
        </div>
      </div>

      {/* 3. Card Edit Modal / Fullscreen Sheet */}
      {editingNote && (
        <KeepEditModal
          note={editingNote}
          allTags={allTags}
          onClose={() => setEditingNote(null)}
          onPin={togglePin}
          onColorChange={updateColor}
          onDelete={trashNote}
        />
      )}
    </div>
  );
}

/* Card Component */
function KeepCard({ 
  note, 
  onEdit, 
  onPin, 
  onColorChange, 
  onDelete 
}: { 
  note: KeepNote; 
  onEdit: (note: KeepNote) => void;
  onPin: (note: KeepNote) => void;
  onColorChange: (noteId: string, color: string | null) => void;
  onDelete: (noteId: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);
  const colorOpt = COLOR_OPTIONS.find((o) => o.hex === note.color) || COLOR_OPTIONS[0];

  async function handleCheckboxClick(e: React.MouseEvent<HTMLInputElement>) {
    e.stopPropagation(); // Avoid opening edit modal
    const checkbox = e.currentTarget;
    const card = checkbox.closest(".keep-card-container");
    if (!card) return;
    const checkboxes = Array.from(card.querySelectorAll("input[type='checkbox']"));
    const idx = checkboxes.indexOf(checkbox);
    if (idx !== -1) {
      const isChecked = checkbox.checked;
      const updatedBody = toggleMarkdownCheckbox(note.body, idx, isChecked);
      await updateKeepNoteAction(note.id, { body: updatedBody });
    }
  }

  const colorFades: Record<string, string> = {
    default: "from-[#16171d] via-[#16171d]/60 to-transparent",
    red: "from-[#221015] via-[#221015]/60 to-transparent",
    orange: "from-[#221712] via-[#221712]/60 to-transparent",
    yellow: "from-[#222212] via-[#222212]/60 to-transparent",
    green: "from-[#102215] via-[#102215]/60 to-transparent",
    teal: "from-[#102222] via-[#102222]/60 to-transparent",
    blue: "from-[#101b2a] via-[#101b2a]/60 to-transparent",
    indigo: "from-[#131428] via-[#131428]/60 to-transparent",
    purple: "from-[#1c102a] via-[#1c102a]/60 to-transparent",
    pink: "from-[#2a1020] via-[#2a1020]/60 to-transparent",
  };
  const fadeClass = colorFades[note.color || "default"] || colorFades.default;

  return (
    <div 
      onClick={() => onEdit(note)}
      className={cn(
        "keep-card-container break-inside-avoid w-full border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg relative group/card flex flex-col justify-between min-h-24 max-h-72 overflow-hidden",
        colorOpt.bgClass,
        colorOpt.borderClass
      )}
    >
      <div className="space-y-2.5 z-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-slate-100 text-sm leading-tight line-clamp-2">{note.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onPin(note);
            }}
            className={cn(
              "h-7 w-7 opacity-100 lg:opacity-0 group-hover/card:opacity-100 transition-opacity",
              note.isPinned ? "text-amber-500" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Pin className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Note Body content */}
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-1.5 last:mb-0 text-sm leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside ml-2 mb-2 text-sm">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside ml-2 mb-2 text-sm">{children}</ol>,
              li: ({ children }) => {
                const hasCheckbox = React.Children.toArray(children).some(
                  (child) => React.isValidElement(child) && (child.props as { type?: unknown }).type === "checkbox"
                );
                return (
                  <li className={cn("mb-0.5", hasCheckbox && "list-none ml-0 flex items-start gap-1.5 [&_p]:m-0 [&_p]:inline")}>
                    {children}
                  </li>
                );
              },
              input: (props) => {
                if (props.type === "checkbox") {
                  return (
                    <input
                      type="checkbox"
                      checked={props.checked}
                      onClick={handleCheckboxClick}
                      onChange={() => {}}
                      className="rounded border-slate-700 bg-transparent text-amber-500 focus:ring-amber-500/35 h-3.5 w-3.5 mr-1.5 cursor-pointer accent-amber-500 align-middle"
                    />
                  );
                }
                const rest = { ...props };
                delete (rest as { node?: unknown }).node;
                return <input {...rest} />;
              },
              h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-1.5">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xs font-bold mb-0.5 mt-1">{children}</h3>,
            }}
          >
            {note.body}
          </ReactMarkdown>
        </div>

        {/* Assigned tags list on Card */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.map((t) => (
              <span 
                key={t.tag.id}
                className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded"
              >
                #{t.tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fade-out overlay at the bottom of the card */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-16 pointer-events-none rounded-b-xl bg-gradient-to-t z-10 transition-all duration-200",
        fadeClass
      )} />

      {/* Card Action footer bar */}
      <div 
        className="flex items-center justify-start gap-1 mt-4 pt-2 border-t border-slate-800/10 opacity-100 lg:opacity-0 group-hover/card:opacity-100 transition-opacity relative z-20"
        onClick={(e) => e.stopPropagation()} // Prevent modal open
      >
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            onClick={() => setShowColors(!showColors)}
          >
            <Palette className="h-3.5 w-3.5" />
          </Button>
          {showColors && (
            <div className="absolute left-0 bottom-8 z-50 flex items-center gap-1 p-1 rounded-lg border border-slate-800 bg-[#16171d] shadow-lg">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className={cn(
                    "h-4.5 w-4.5 rounded-full border border-slate-700/60",
                    option.bgClass,
                    note.color === option.hex && "ring-1 ring-purple-500"
                  )}
                  onClick={() => {
                    onColorChange(note.id, option.hex);
                    setShowColors(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
          onClick={() => onDelete(note.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* Edit Modal / Fullscreen Sheet Component */
function KeepEditModal({
  note,
  allTags,
  onClose,
  onPin,
  onColorChange,
  onDelete
}: {
  note: KeepNote;
  allTags: { id: string; name: string; slug: string }[];
  onClose: () => void;
  onPin: (note: KeepNote) => void;
  onColorChange: (noteId: string, color: string | null) => void;
  onDelete: (noteId: string) => void;
}) {
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const modalEditorRef = useRef<Editor | null>(null);
  const colorOpt = COLOR_OPTIONS.find((o) => o.hex === note.color) || COLOR_OPTIONS[0];

  // Debounced autosave ref states
  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const lastSavedTitle = useRef(note.title);
  const lastSavedBody = useRef(note.body);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);

  // Save changes callback
  const save = useCallback(async () => {
    const finalBody = bodyRef.current;
    const t = titleRef.current.trim() || "Untitled note";

    if (t === lastSavedTitle.current && finalBody === lastSavedBody.current) {
      return;
    }

    lastSavedTitle.current = t;
    lastSavedBody.current = finalBody;

    await updateKeepNoteAction(note.id, {
      title: t,
      body: finalBody
    });
  }, [note.id]);

  // Debounced autosave triggers (1.5 seconds)
  useEffect(() => {
    const timer = setTimeout(save, 1500);
    return () => clearTimeout(timer);
  }, [title, body, save]);

  // Force save on modal close (instant flush)
  const handleClose = async () => {
    await save();
    onClose();
  };

  // Tags toggle (instant save)
  async function toggleTag(tagId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("noteId", note.id);
      formData.append("tagId", tagId);
      formData.append("returnTo", "/");
      await toggleNoteTagAction(formData);
    });
  }

  async function createNewTag() {
    if (!newTagName.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", newTagName.trim());
      formData.append("noteId", note.id);
      formData.append("returnTo", "/");
      await createTagAction(formData);
      setNewTagName("");
    });
  }

  // Click outside to close modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current && 
        !modalRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  });

  if (typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div 
        ref={modalRef}
        className={cn(
          "w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-xl sm:rounded-xl border shadow-2xl flex flex-col justify-between transition-all",
          colorOpt.bgClass,
          colorOpt.borderClass
        )}
      >
        <div className="p-5 overflow-y-auto min-h-0 flex-1 space-y-4">
          
          {/* Title & Pin */}
          <div className="flex justify-between items-start gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="border-0 bg-transparent px-0 py-0 text-base font-bold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500 text-slate-100"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPin(note)}
              className={cn(
                "h-8 w-8 shrink-0 hover:bg-slate-800/50",
                note.isPinned ? "text-amber-500" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Pin className="h-4.5 w-4.5" />
            </Button>
          </div>

          {/* Note content */}
          <FilebucketEditor
            markdown={body}
            onChange={setBody}
            mode="keep"
            className="w-full text-sm leading-relaxed"
            onEditorReady={(editor) => {
              modalEditorRef.current = editor;
            }}
          />

          {/* Assigned tags list in Modal */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {note.tags.map((t) => (
                <span 
                  key={t.tag.id}
                  className="text-[10px] bg-slate-900 border border-slate-800/80 text-slate-400 px-2 py-0.5 rounded flex items-center gap-1"
                >
                  <span>#{t.tag.name}</span>
                  <button 
                    onClick={() => toggleTag(t.tag.id)}
                    className="text-slate-500 hover:text-slate-300 font-bold ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-800/40 flex items-center justify-between relative bg-black/10 select-none">
          <div className="flex items-center gap-1.5">
            {/* Color picker */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowTagMenu(false);
                }}
                title="Change color"
              >
                <Palette className="h-4.5 w-4.5" />
              </Button>
              {showColorPicker && (
                <div className="absolute left-0 bottom-10 z-50 flex items-center gap-1 p-1.5 rounded-lg border border-slate-800 bg-[#16171d] shadow-xl">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      className={cn(
                        "h-5 w-5 rounded-full border border-slate-700/60",
                        option.bgClass,
                        note.color === option.hex && "ring-1 ring-amber-500"
                      )}
                      title={option.label}
                      onClick={() => {
                        onColorChange(note.id, option.hex);
                        setShowColorPicker(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Tags Popover */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                onClick={() => {
                  setShowTagMenu(!showTagMenu);
                  setShowColorPicker(false);
                }}
              >
                <Tag className="h-4.5 w-4.5" />
              </Button>
              {showTagMenu && (
                <div className="absolute left-0 bottom-10 z-50 w-56 rounded-md border border-slate-850 bg-[#16171d]/95 backdrop-blur-md p-1.5 text-slate-100 shadow-xl max-h-56 overflow-y-auto">
                  <div className="p-1 border-b border-slate-800 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Add or create tag"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="w-full h-7 px-1.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                    <Button 
                      size="icon" 
                      className="h-7 w-7 bg-amber-600 hover:bg-amber-500 shrink-0"
                      onClick={createNewTag}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="py-1 space-y-0.5 max-h-36 overflow-y-auto">
                    {allTags.map((tag) => {
                      const isAssigned = note.tags.some((t) => t.tag.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className="w-full h-7 px-2 rounded hover:bg-slate-800 text-left text-xs text-slate-300 flex items-center justify-between"
                          onClick={() => toggleTag(tag.id)}
                        >
                          <span>#{tag.name}</span>
                          {isAssigned && <Check className="h-3 w-3 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Change checklist mode */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              onClick={() => {
                if (modalEditorRef.current) {
                  modalEditorRef.current.commands.toggleTaskList();
                }
              }}
              title="Toggle checklist"
            >
              <CheckSquare className="h-4.5 w-4.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 className="h-4.5 w-4.5" />
            </Button>
          </div>

          <Button
            size="sm"
            className="bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-800 hover:border-slate-700"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { 
  Pin, 
  CheckSquare, 
  Type, 
  Palette, 
  Tag, 
  Trash2, 
  X, 
  Plus, 
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  createKeepNoteAction, 
  updateKeepNoteAction, 
  trashKeepNoteAction 
} from "@/app/notes/actions";
import { toggleNoteTagAction, createTagAction } from "@/app/tags/actions";
import { parseMarkdownChecklist, serializeMarkdownChecklist, type ChecklistItem } from "@/lib/keep";

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
  const [isChecklistCreation, setIsChecklistCreation] = useState(false);
  const [newChecklistItems, setNewChecklistItems] = useState<ChecklistItem[]>([]);
  const [newNoteColor, setNewNoteColor] = useState<string | null>(null);
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [showColorPickerForCreation, setShowColorPickerForCreation] = useState(false);

  const creationContainerRef = useRef<HTMLDivElement>(null);

  // Close creation bar and save
  const closeAndSaveCreation = useCallback(async () => {
    if (!newTitle.trim() && !newBody.trim() && newChecklistItems.length === 0) {
      setIsCreating(false);
      setIsChecklistCreation(false);
      return;
    }

    const finalBody = isChecklistCreation 
      ? serializeMarkdownChecklist(newChecklistItems) 
      : newBody;

    const data = {
      folderId: keepRootId,
      title: newTitle.trim() || "Untitled note",
      body: finalBody,
      color: newNoteColor,
      isPinned: newNotePinned
    };

    setIsCreating(false);
    setIsChecklistCreation(false);
    setNewTitle("");
    setNewBody("");
    setNewChecklistItems([]);
    setNewNoteColor(null);
    setNewNotePinned(false);

    await createKeepNoteAction(data);
  }, [newTitle, newBody, isChecklistCreation, newChecklistItems, newNoteColor, newNotePinned, keepRootId]);

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
                  setIsChecklistCreation(true);
                  setNewChecklistItems([{ id: "init-1", text: "", checked: false }]);
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
                  newNotePinned ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
                )}
                onClick={() => setNewNotePinned(!newNotePinned)}
              >
                <Pin className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* Note Content Input */}
            {!isChecklistCreation ? (
              <textarea
                placeholder="Take a note..."
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={3}
                className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-slate-500 resize-none leading-relaxed focus:ring-0 focus:outline-none"
              />
            ) : (
              // Checklist Creation Inputs
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {newChecklistItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => {
                        const nextItems = [...newChecklistItems];
                        nextItems[idx].checked = e.target.checked;
                        setNewChecklistItems(nextItems);
                      }}
                      className="rounded border-slate-700 bg-transparent text-purple-600 focus:ring-purple-600/35 h-3.5 w-3.5"
                    />
                    <input
                      type="text"
                      placeholder="List item"
                      value={item.text}
                      onChange={(e) => {
                        const nextItems = [...newChecklistItems];
                        nextItems[idx].text = e.target.value;
                        setNewChecklistItems(nextItems);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const nextItems = [...newChecklistItems];
                          nextItems.splice(idx + 1, 0, { id: Math.random().toString(36).substring(2, 9), text: "", checked: false });
                          setNewChecklistItems(nextItems);
                          // Delay focusing the next sibling input
                          setTimeout(() => {
                            const inputs = creationContainerRef.current?.querySelectorAll("input[type='text']");
                            (inputs?.[idx + 2] as HTMLInputElement)?.focus();
                          }, 10);
                        }
                      }}
                      className="flex-1 bg-transparent border-0 outline-none text-sm focus:ring-0 focus:outline-none placeholder:text-slate-600"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                      onClick={() => {
                        setNewChecklistItems(newChecklistItems.filter((_, i) => i !== idx));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-400 hover:text-slate-200 h-7 px-2 font-medium"
                  onClick={() => setNewChecklistItems([...newChecklistItems, { id: Math.random().toString(36).substring(2, 9), text: "", checked: false }])}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add item
                </Button>
              </div>
            )}

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
                            newNoteColor === option.hex && "ring-1 ring-purple-500"
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
                  onClick={() => setIsChecklistCreation(!isChecklistCreation)}
                  title={isChecklistCreation ? "Convert to text note" : "Convert to checklist"}
                >
                  {isChecklistCreation ? <Type className="h-4.5 w-4.5" /> : <CheckSquare className="h-4.5 w-4.5" />}
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
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 [column-fill:_balance] w-full">
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
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 [column-fill:_balance] w-full">
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

  const { items, isChecklist } = parseMarkdownChecklist(note.body);

  async function handleCheckboxToggle(idx: number, checked: boolean, e: React.MouseEvent) {
    e.stopPropagation(); // Avoid opening edit modal
    const nextItems = [...items];
    nextItems[idx].checked = checked;
    const finalBody = serializeMarkdownChecklist(nextItems);
    await updateKeepNoteAction(note.id, { body: finalBody });
  }

  return (
    <div 
      onClick={() => onEdit(note)}
      className={cn(
        "break-inside-avoid w-full border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg relative group/card flex flex-col justify-between min-h-24",
        colorOpt.bgClass,
        colorOpt.borderClass
      )}
    >
      <div className="space-y-2.5">
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
              note.isPinned ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Pin className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Note Body content */}
        {!isChecklist ? (
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-8">
            {note.body}
          </p>
        ) : (
          // Checklist view on card
          <div className="space-y-1 max-h-52 overflow-hidden pr-0.5">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-1.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onClick={(e) => handleCheckboxToggle(idx, !item.checked, e)}
                  onChange={() => {}} // Controlled by onClick
                  className="rounded border-slate-700 bg-transparent text-purple-600 focus:ring-purple-600/35 h-3 w-3"
                />
                <span className={cn("truncate flex-1", item.checked && "line-through text-slate-500")}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}

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

      {/* Card Action footer bar */}
      <div 
        className="flex items-center justify-start gap-1 mt-4 pt-2 border-t border-slate-800/10 opacity-100 lg:opacity-0 group-hover/card:opacity-100 transition-opacity relative"
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
  const { items: initItems, isChecklist: initIsChecklist } = parseMarkdownChecklist(note.body);
  const [isChecklist, setIsChecklist] = useState(initIsChecklist);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(initItems);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const colorOpt = COLOR_OPTIONS.find((o) => o.hex === note.color) || COLOR_OPTIONS[0];

  // Debounced autosave ref states
  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const checklistItemsRef = useRef(checklistItems);
  const isChecklistRef = useRef(isChecklist);
  const lastSavedTitle = useRef(note.title);
  const lastSavedBody = useRef(note.body);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);

  useEffect(() => {
    checklistItemsRef.current = checklistItems;
  }, [checklistItems]);

  useEffect(() => {
    isChecklistRef.current = isChecklist;
  }, [isChecklist]);

  // Save changes callback
  const save = useCallback(async () => {
    const finalBody = isChecklistRef.current 
      ? serializeMarkdownChecklist(checklistItemsRef.current) 
      : bodyRef.current;

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
  }, [title, body, checklistItems, save]);

  // Force save on modal close (instant flush)
  const handleClose = async () => {
    await save();
    onClose();
  };

  // Checklist updates (instant saves)
  async function handleCheckboxChange(idx: number, checked: boolean) {
    const next = [...checklistItems];
    next[idx].checked = checked;
    setChecklistItems(next);
    checklistItemsRef.current = next;
    
    // Save checklist checkboxes immediately
    const finalBody = serializeMarkdownChecklist(next);
    lastSavedBody.current = finalBody;
    await updateKeepNoteAction(note.id, { body: finalBody });
  }

  async function handleItemTextChange(idx: number, text: string) {
    const next = [...checklistItems];
    next[idx].text = text;
    setChecklistItems(next);
    checklistItemsRef.current = next;
  }

  async function handleAddChecklistItem() {
    const next = [...checklistItems, { id: Math.random().toString(36).substring(2, 9), text: "", checked: false }];
    setChecklistItems(next);
    checklistItemsRef.current = next;
  }

  async function handleRemoveChecklistItem(idx: number) {
    const next = checklistItems.filter((_, i) => i !== idx);
    setChecklistItems(next);
    checklistItemsRef.current = next;
    
    const finalBody = serializeMarkdownChecklist(next);
    lastSavedBody.current = finalBody;
    await updateKeepNoteAction(note.id, { body: finalBody });
  }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div 
        ref={modalRef}
        className={cn(
          "w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-xl sm:rounded-xl border shadow-2xl flex flex-col justify-between transition-all",
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
                note.isPinned ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Pin className="h-4.5 w-4.5" />
            </Button>
          </div>

          {/* Note content */}
          {!isChecklist ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Note"
              rows={6}
              className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-slate-500 resize-none leading-relaxed focus:ring-0 focus:outline-none"
            />
          ) : (
            // Checklist editor
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {checklistItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => handleCheckboxChange(idx, e.target.checked)}
                    className="rounded border-slate-700 bg-transparent text-purple-600 focus:ring-purple-600/35 h-3.5 w-3.5"
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleItemTextChange(idx, e.target.value)}
                    className={cn(
                      "flex-1 bg-transparent border-0 outline-none text-sm focus:ring-0 focus:outline-none placeholder:text-slate-600",
                      item.checked && "line-through text-slate-500"
                    )}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                    onClick={() => handleRemoveChecklistItem(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-slate-200 h-7 px-2 font-medium"
                onClick={handleAddChecklistItem}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add item
              </Button>
            </div>
          )}

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
                        note.color === option.hex && "ring-1 ring-purple-500"
                      )}
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
                      className="h-7 w-7 bg-purple-600 hover:bg-purple-500 shrink-0"
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
                          {isAssigned && <Check className="h-3 w-3 text-purple-400" />}
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
                const nextChecklistMode = !isChecklist;
                setIsChecklist(nextChecklistMode);
                isChecklistRef.current = nextChecklistMode;
                if (nextChecklistMode && checklistItems.length === 0) {
                  setChecklistItems([{ id: "init-1", text: body, checked: false }]);
                } else if (!nextChecklistMode) {
                  setBody(checklistItems.map((c) => c.text).join("\n"));
                }
              }}
            >
              {isChecklist ? <Type className="h-4.5 w-4.5" /> : <CheckSquare className="h-4.5 w-4.5" />}
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
    </div>
  );
}

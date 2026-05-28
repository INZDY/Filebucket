"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, MoreHorizontal, Move, Pencil, Trash2 } from "lucide-react";

import { renameNoteAction, moveNoteAction, trashNoteAction } from "@/app/notes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NoteRowProps = {
  note: {
    id: string;
    title: string;
    folderId: string | null;
  };
  href: string;
  isActive: boolean;
  depth?: number;
  destinations: {
    id: string;
    name: string;
  }[];
};

type MenuMode = "actions" | "move" | "rename";

type MenuState = {
  x: number;
  y: number;
  mode: MenuMode;
} | null;

export function NoteRow({
  depth = 0,
  destinations,
  href,
  isActive,
  note,
}: NoteRowProps) {
  const [menu, setMenu] = useState<MenuState>(null);

  useEffect(() => {
    if (!menu) return;

    function close() {
      setMenu(null);
    }

    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  function openMenu(x: number, y: number, mode: MenuMode = "actions") {
    setMenu({
      x: Math.min(x, window.innerWidth - 240),
      y: Math.min(y, window.innerHeight - 180),
      mode,
    });
  }

  function handleDragStart(event: React.DragEvent) {
    event.dataTransfer.setData("application/filebucket", JSON.stringify({ type: "note", id: note.id }));
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      className={cn(
        "group relative flex h-9 items-center rounded-md text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-50",
        isActive && "bg-teal-500/15 text-teal-100 hover:bg-teal-500/20",
      )}
      draggable
      onDragStart={handleDragStart}
    >
      {menu?.mode === "rename" ? (
        <form
          action={renameNoteAction}
          className="flex flex-1 items-center gap-2 px-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <input type="hidden" name="noteId" value={note.id} />
          <Input
            autoFocus
            className="h-7 w-full bg-slate-900 border-slate-700 text-slate-100 text-xs px-2 focus-visible:ring-1"
            name="name"
            defaultValue={note.title}
            required
          />
          <div className="flex gap-1 shrink-0">
            <Button onClick={() => setMenu(null)} size="sm" type="button" variant="ghost">
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>
      ) : (
        <Link
          className="flex min-w-0 flex-1 items-center gap-2 pr-3"
          href={href}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1 truncate">{note.title}</span>
        </Link>
      )}

      {menu?.mode !== "rename" && (
        <Button
          aria-label={`Note actions for ${note.title}`}
          className="mr-1 h-7 w-7 text-slate-400 opacity-100 hover:bg-slate-700 hover:text-slate-100 lg:opacity-0 lg:group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            openMenu(rect.left, rect.bottom + 4);
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )}

      {menu ? (
        <div
          className="fixed z-50 w-56 rounded-md border border-slate-700 bg-[#1b1f27] p-1 text-slate-100 shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.mode === "move" ? (
            <form action={moveNoteAction} className="space-y-2 p-2">
              <input type="hidden" name="noteId" value={note.id} />
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                Move to
                <select
                  autoFocus
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  name="folderId"
                  defaultValue={note.folderId ?? ""}
                >
                  <option value="">Vault</option>
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setMenu(null)} size="sm" type="button" variant="ghost">
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Move
                </Button>
              </div>
            </form>
          ) : menu.mode === "actions" ? (
            <div className="space-y-1">
              <Button
                className="h-9 w-full justify-start px-2"
                onClick={() => setMenu((current) => current ? { ...current, mode: "rename" } : current)}
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
                Rename
              </Button>
              <Button
                className="h-9 w-full justify-start px-2"
                onClick={() => setMenu((current) => current ? { ...current, mode: "move" } : current)}
                type="button"
                variant="ghost"
              >
                <Move className="h-4 w-4" />
                Move
              </Button>
              <form action={trashNoteAction}>
                <input type="hidden" name="noteId" value={note.id} />
                <input type="hidden" name="folderId" value={note.folderId ?? ""} />
                <Button className="h-9 w-full justify-start px-2" type="submit" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                  Move to trash
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

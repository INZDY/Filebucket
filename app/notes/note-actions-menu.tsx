"use client";

import { MoreHorizontal, Move, Trash2, Download } from "lucide-react";
import { useEffect, useState } from "react";

import { moveNoteAction, trashNoteAction } from "@/app/notes/actions";
import { Button } from "@/components/ui/button";

type NoteActionsMenuProps = {
  note: {
    id: string;
    title: string;
    folderId: string | null;
  };
  destinations: {
    id: string;
    name: string;
  }[];
};

type MenuMode = "actions" | "move";

type MenuState = {
  x: number;
  y: number;
  mode: MenuMode;
} | null;

export function NoteActionsMenu({ destinations, note }: NoteActionsMenuProps) {
  const [menu, setMenu] = useState<MenuState>(null);

  useEffect(() => {
    if (!menu) {
      return;
    }

    function close() {
      setMenu(null);
    }

    window.addEventListener("click", close);

    return () => {
      window.removeEventListener("click", close);
    };
  }, [menu]);

  function openMenu(x: number, y: number) {
    setMenu({
      x: Math.min(x, window.innerWidth - 240),
      y: Math.min(y, window.innerHeight - 180),
      mode: "actions",
    });
  }

  return (
    <div className="relative">
      <Button
        aria-label={`Note actions for ${note.title}`}
        className="h-9 w-9 border-slate-700 bg-[#1f242c] text-slate-300 hover:bg-slate-800 hover:text-slate-50"
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          openMenu(rect.left, rect.bottom + 4);
        }}
        size="icon"
        type="button"
        variant="outline"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

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
                  defaultValue={note.folderId ?? ""}
                  name="folderId"
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
          ) : (
            <div className="space-y-1">
              <Button
                className="h-9 w-full justify-start px-2"
                onClick={() => setMenu((current) => current ? { ...current, mode: "move" } : current)}
                type="button"
                variant="ghost"
              >
                <Move className="h-4 w-4" />
                Move
              </Button>
              <Button
                asChild
                className="h-9 w-full justify-start px-2 text-slate-100 hover:bg-slate-800"
                variant="ghost"
              >
                <a href={`/api/export?noteId=${note.id}`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Export as Markdown
                </a>
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
          )}
        </div>
      ) : null}
    </div>
  );
}

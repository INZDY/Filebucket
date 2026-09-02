"use client";

import { MoreHorizontal, Move, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MenuMode = "actions" | "move" | "rename";

type MenuState = {
  x: number;
  y: number;
  mode: MenuMode;
} | null;

type CardActionsMenuProps = {
  id: string;
  label: string;
  currentName: string;
  currentFolderId: string | null;
  destinations: {
    id: string;
    name: string;
  }[];
  excludeIds?: string[];
  onRename: (name: string) => void | Promise<void>;
  onMove: (folderId: string | null) => void | Promise<void>;
  onTrash: () => void | Promise<void>;
};

export function CardActionsMenu({
  currentFolderId,
  currentName,
  destinations,
  excludeIds = [],
  id,
  label,
  onMove,
  onRename,
  onTrash,
}: CardActionsMenuProps) {
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

  useEffect(() => {
    function handleCloseOthers(event: Event) {
      const customEvent = event as CustomEvent<{ exceptId: string }>;
      if (customEvent.detail?.exceptId !== id) {
        setMenu(null);
      }
    }

    window.addEventListener("close-actions-menus", handleCloseOthers);

    return () => {
      window.removeEventListener("close-actions-menus", handleCloseOthers);
    };
  }, [id]);

  function openMenu(x: number, y: number) {
    window.dispatchEvent(
      new CustomEvent("close-actions-menus", {
        detail: { exceptId: id },
      })
    );
    setMenu({
      x: Math.min(x, window.innerWidth - 240),
      y: Math.min(y, window.innerHeight - 180),
      mode: "actions",
    });
  }

  function changeMode(mode: MenuMode) {
    setMenu((current) => (current ? { ...current, mode } : current));
  }

  return (
    <div className="relative">
      <Button
        aria-label={`Actions for ${label}`}
        className="h-7 w-7 border-slate-700 bg-[#1f242c] text-slate-300 hover:bg-slate-800 hover:text-slate-50"
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          openMenu(rect.left, rect.bottom + 4);
        }}
        size="icon"
        type="button"
        variant="outline"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Button>

      {menu ? (
        <div
          className="fixed z-50 w-56 rounded-md border border-slate-700 bg-[#1b1f27] p-1 text-slate-100 shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.mode === "rename" ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const name = formData.get("name") as string;
                setMenu(null);
                await onRename(name);
              }}
              className="space-y-2 p-2"
            >
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                New name
                <Input
                  autoFocus
                  className="h-9 w-full border-input bg-background px-3 text-sm text-foreground"
                  defaultValue={currentName}
                  name="name"
                  required
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setMenu(null)} size="sm" type="button" variant="ghost">
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save
                </Button>
              </div>
            </form>
          ) : menu.mode === "move" ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const folderId = formData.get("folderId") as string;
                setMenu(null);
                await onMove(folderId || null);
              }}
              className="space-y-2 p-2"
            >
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                Move to
                <select
                  autoFocus
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  defaultValue={currentFolderId ?? ""}
                  name="folderId"
                >
                  <option value="">Vault</option>
                  {destinations
                    .filter((destination) => !excludeIds.includes(destination.id))
                    .map((destination) => (
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
                onClick={() => changeMode("rename")}
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
                Rename
              </Button>
              <Button
                className="h-9 w-full justify-start px-2"
                onClick={() => changeMode("move")}
                type="button"
                variant="ghost"
              >
                <Move className="h-4 w-4" />
                Move
              </Button>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setMenu(null);
                  await onTrash();
                }}
              >
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Folder, FolderOpen, MoreHorizontal, Move, Pencil, Trash2 } from "lucide-react";

import {
  moveFolderAction,
  renameFolderAction,
  trashFolderAction,
} from "@/app/folders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FolderRowProps = {
  folder: {
    id: string;
    name: string;
    count: number;
    parentId: string | null;
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

export function FolderRow({
  depth = 0,
  destinations,
  folder,
  href,
  isActive,
}: FolderRowProps) {
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

  function openMenu(x: number, y: number, mode: MenuMode = "actions") {
    setMenu({
      x: Math.min(x, window.innerWidth - 240),
      y: Math.min(y, window.innerHeight - 180),
      mode,
    });
  }

  return (
    <div
      className={cn(
        "group relative flex h-10 items-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-teal-50 text-teal-950 hover:bg-teal-100",
      )}
    >
      <Link
        className="flex min-w-0 flex-1 items-center gap-2 pr-3"
        href={href}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {isActive ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />}
        <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
        <span className="text-xs text-muted-foreground">{folder.count}</span>
      </Link>
      <Button
        aria-label={`Folder actions for ${folder.name}`}
        className="mr-1 h-8 w-8 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
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

      {menu ? (
        <div
          className="fixed z-50 w-56 rounded-md border bg-white p-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.mode === "rename" ? (
            <form
              action={renameFolderAction}
              className="space-y-2 p-2"
              onKeyDown={(event) => event.stopPropagation()}
            >
              <input type="hidden" name="folderId" value={folder.id} />
              <Input autoFocus name="name" defaultValue={folder.name} required />
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
            <form action={moveFolderAction} className="space-y-2 p-2">
              <input type="hidden" name="folderId" value={folder.id} />
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                Move to
                <select
                  autoFocus
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  name="parentId"
                  defaultValue={folder.parentId ?? ""}
                >
                  <option value="">Vault</option>
                  {destinations
                    .filter((destination) => destination.id !== folder.id)
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
              <form action={trashFolderAction}>
                <input type="hidden" name="folderId" value={folder.id} />
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

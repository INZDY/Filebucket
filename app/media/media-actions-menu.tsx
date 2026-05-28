"use client";

import { MoreHorizontal, Move, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { moveMediaAssetAction, trashMediaAssetAction } from "@/app/media/actions";
import { Button } from "@/components/ui/button";

type MediaActionsMenuProps = {
  mediaAsset: {
    id: string;
    filename: string;
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

export function MediaActionsMenu({ destinations, mediaAsset }: MediaActionsMenuProps) {
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
        aria-label={`Media actions for ${mediaAsset.filename}`}
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
            <form action={moveMediaAssetAction} className="space-y-2 p-2">
              <input type="hidden" name="mediaAssetId" value={mediaAsset.id} />
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                Move to
                <select
                  autoFocus
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  defaultValue={mediaAsset.folderId ?? ""}
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
              <form action={trashMediaAssetAction}>
                <input type="hidden" name="mediaAssetId" value={mediaAsset.id} />
                <input type="hidden" name="folderId" value={mediaAsset.folderId ?? ""} />
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

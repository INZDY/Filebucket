"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, StickyNote, MessageSquare, ChevronDown, ChevronRight, Folder, FolderOpen, MoreHorizontal, Move, Pencil, Trash2, Download } from "lucide-react";

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
    type?: string;
  };
  href: string;
  isActive: boolean;
  depth?: number;
  destinations: {
    id: string;
    name: string;
  }[];
  isExpanded?: boolean;
  onToggle?: () => void;
  hasChildren?: boolean;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isChatChannel?: boolean;
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
  isExpanded = false,
  onToggle,
  hasChildren = false,
  isDragOver = false,
  onDragOver,
  onDragLeave,
  onDrop,
  isChatChannel = false,
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

  function handleDragStart(event: React.DragEvent) {
    event.dataTransfer.setData("application/filebucket", JSON.stringify({ type: "folder", id: folder.id }));
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      className={cn(
        "group relative flex h-10 items-center rounded-md text-sm text-slate-200 transition-colors hover:bg-slate-800/80 hover:text-slate-50",
        isActive && "bg-purple-600/15 text-purple-200 hover:bg-purple-600/20",
        isDragOver && "bg-purple-950/20 border border-dashed border-purple-500",
      )}
      draggable={!(folder.type === "NOTES_ROOT" || folder.type === "KEEP_ROOT" || folder.type === "CHAT_ROOT")}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onContextMenu={(event) => {
        const isReserved = folder.type === "NOTES_ROOT" || folder.type === "KEEP_ROOT" || folder.type === "CHAT_ROOT";
        if (isReserved) {
          event.preventDefault();
          return;
        }
        if (menu?.mode === "rename") return;
        event.preventDefault();
        event.stopPropagation();
        openMenu(event.clientX, event.clientY);
      }}
    >
      {menu?.mode === "rename" ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const newName = formData.get("name") as string;
            window.dispatchEvent(new CustomEvent("vault-mutate", {
              detail: { type: "rename-folder", folderId: folder.id, name: newName }
            }));
            setMenu(null);
            await renameFolderAction(formData);
          }}
          className="flex flex-1 items-center gap-2 px-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <input type="hidden" name="folderId" value={folder.id} />
          <Input
            autoFocus
            className="h-7 w-full bg-slate-900 border-slate-700 text-slate-100 text-xs px-2 focus-visible:ring-1"
            name="name"
            defaultValue={folder.name}
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
        <div className="flex flex-1 items-center min-w-0 h-full">
          {/* Alignment spacer & chevron toggle */}
          <div className="flex items-center shrink-0" style={{ paddingLeft: `${4 + depth * 16}px` }}>
            {hasChildren ? (
              <button
                aria-label={isExpanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle?.();
                }}
                type="button"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <div className="w-6 h-6" /> // spacer to align folder icons
            )}
          </div>

          <Link
            className="flex min-w-0 flex-1 items-center gap-2 pr-3 py-2"
            href={href}
          >
            {(() => {
              if (folder.type === "NOTES_ROOT") return <BookOpen className="h-4 w-4 shrink-0 text-purple-400" />;
              if (folder.type === "KEEP_ROOT") return <StickyNote className="h-4 w-4 shrink-0 text-yellow-500" />;
              if (folder.type === "CHAT_ROOT") return <MessageSquare className="h-4 w-4 shrink-0 text-purple-400" />;
              return isExpanded ? <FolderOpen className="h-4 w-4 shrink-0 text-slate-300" /> : <Folder className="h-4 w-4 shrink-0 text-slate-400" />;
            })()}
            <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
          </Link>
        </div>
      )}

      {menu?.mode !== "rename" && !(folder.type === "NOTES_ROOT" || folder.type === "KEEP_ROOT" || folder.type === "CHAT_ROOT") && (
        <Button
          aria-label={`Folder actions for ${folder.name}`}
          className="mr-1 h-8 w-8 text-slate-400 opacity-100 hover:bg-slate-700 hover:text-slate-100 lg:opacity-0 lg:group-hover:opacity-100"
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

      {menu && menu.mode !== "rename" ? (
        <div
          className="fixed z-50 w-56 rounded-md border border-slate-800/80 bg-[#14141a]/95 backdrop-blur-md p-1 text-slate-100 shadow-xl"
          onClick={(event) => event.stopPropagation()}
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.mode === "move" ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const parentId = formData.get("parentId") as string;
                window.dispatchEvent(new CustomEvent("vault-mutate", {
                  detail: { type: "move-folder", folderId: folder.id, parentId: parentId || null }
                }));
                setMenu(null);
                await moveFolderAction(formData);
              }}
              className="space-y-2 p-2"
            >
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
              {isChatChannel ? (
                <Button
                  asChild
                  className="h-9 w-full justify-start px-2 text-slate-100 hover:bg-slate-800"
                  variant="ghost"
                >
                  <a href={`/api/export?chatFolderId=${folder.id}`} download>
                    <Download className="h-4 w-4" />
                    Export Transcript
                  </a>
                </Button>
              ) : (
                <Button
                  asChild
                  className="h-9 w-full justify-start px-2 text-slate-100 hover:bg-slate-800"
                  variant="ghost"
                >
                  <a href={`/api/export?folderId=${folder.id}`} download>
                    <Download className="h-4 w-4" />
                    Export as ZIP
                  </a>
                </Button>
              )}
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  window.dispatchEvent(new CustomEvent("vault-mutate", {
                    detail: { type: "trash-folder", folderId: folder.id }
                  }));
                  setMenu(null);
                  await trashFolderAction(formData);
                }}
              >
                <input type="hidden" name="folderId" value={folder.id} />
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

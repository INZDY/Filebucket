"use client";

import React, { useState, useEffect } from "react";
import { SidebarBrowser } from "@/app/vault/sidebar-browser";
import { ActiveWorkspace } from "@/app/vault/active-workspace";
import { TrashWorkspace } from "@/app/vault/trash-workspace";
import { KeepWorkspace } from "@/app/vault/keep-workspace";
import { ChatWorkspace } from "@/app/vault/chat-workspace";
import { MainContentTabs } from "@/app/vault/main-content-tabs";
import { ResizableVault } from "@/app/vault/resizable-vault";
import { GlobalLoader } from "@/components/global-loader";
import { SearchInput } from "@/components/search-input";
import { HeaderHamburger } from "@/components/header-hamburger";
import { ActivityBar } from "@/components/activity-bar";
import { resolveViewMode } from "@/lib/mode";
import { getMediaAssetUrl } from "@/lib/utils";

type FolderListEntry = {
  id: string;
  name: string;
  parentId: string | null;
  type?: string;
  _count?: {
    children?: number;
    mediaAssets?: number;
    notes?: number;
  };
};

type NoteListEntry = {
  id: string;
  title: string;
  body: string;
  userId: string;
  folderId: string | null;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  color: string | null;
  isPinned: boolean;
  tags: {
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
  folder?: {
    id: string;
    name: string;
  } | null;
};

type MediaListEntry = {
  id: string;
  userId: string;
  noteId: string | null;
  folderId: string | null;
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  chatMessageId: string | null;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  folder?: {
    id: string;
    name: string;
  } | null;
};

type TagEntry = {
  id: string;
  name: string;
  slug: string;
  _count: {
    notes: number;
  };
};

type DeletedFolderEntry = FolderListEntry & {
  deletedAt: Date | string | null;
  parent?: {
    deletedAt?: Date | string | null;
  } | null;
};

type DeletedNoteEntry = {
  id: string;
  title: string;
  body: string;
  userId: string;
  folderId: string | null;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  color: string | null;
  isPinned: boolean;
  folder?: {
    id: string;
    name: string;
    deletedAt?: Date | string | null;
  } | null;
};

type DeletedMediaEntry = MediaListEntry & {
  folder?: {
    id: string;
    name: string;
    deletedAt?: Date | string | null;
  } | null;
};

type VaultDashboardProps = {
  userId: string;
  initialFolders: FolderListEntry[];
  initialNotes: NoteListEntry[];
  initialMediaAssets: MediaListEntry[];
  initialTags: TagEntry[];
  initialDeletedFolders: DeletedFolderEntry[];
  initialDeletedNotes: DeletedNoteEntry[];
  initialDeletedMediaAssets: DeletedMediaEntry[];
  initialSearchParams: {
    folder?: string;
    note?: string;
    media?: string;
    view?: string;
    q?: string;
    tag?: string;
  } | null;
};

function flattenFolders(folders: FolderListEntry[]) {
  const children = new Map<string | null, FolderListEntry[]>();

  for (const folder of folders) {
    const siblings = children.get(folder.parentId) ?? [];
    siblings.push(folder);
    children.set(folder.parentId, siblings);
  }

  const rows: { depth: number; folder: FolderListEntry }[] = [];

  function appendFolders(parentId: string | null, depth: number) {
    for (const folder of children.get(parentId) ?? []) {
      rows.push({ depth, folder });
      appendFolders(folder.id, depth + 1);
    }
  }

  appendFolders(null, 0);
  return rows;
}

function getFolderTrail(folders: FolderListEntry[], selectedFolder: FolderListEntry | null) {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const trail: FolderListEntry[] = [];
  let current = selectedFolder;

  while (current) {
    trail.unshift(current);
    current = current.parentId ? foldersById.get(current.parentId) ?? null : null;
  }

  return trail;
}

function getNoteOutline(body: string) {
  return body
    .split("\n")
    .map((line, index) => {
      const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());

      if (!heading) return null;

      return {
        id: `${index}-${heading[2]}`,
        depth: heading[1].length,
        title: heading[2].replace(/\s+#+$/, ""),
      };
    })
    .filter((heading): heading is { id: string; depth: number; title: string } => Boolean(heading));
}

function getContentHref({
  folderId,
  mediaId,
  noteId,
  query,
  tagSlug,
}: {
  folderId?: string | null;
  mediaId?: string;
  noteId?: string;
  query?: string;
  tagSlug?: string;
}) {
  const hrefParams = new URLSearchParams();

  if (folderId) hrefParams.set("folder", folderId);
  if (noteId) hrefParams.set("note", noteId);
  if (mediaId) hrefParams.set("media", mediaId);
  if (query) hrefParams.set("q", query);
  if (tagSlug && !mediaId) hrefParams.set("tag", tagSlug);

  return `/${hrefParams.toString() ? `?${hrefParams.toString()}` : ""}`;
}

function getMediaPreviewKind(contentType: string) {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType === "application/pdf") return "pdf";
  if (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/javascript"
  ) {
    return "text";
  }
  return "unsupported";
}

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

function NoteSkeleton() {
  return (
    <div className="flex h-full flex-col p-6 animate-pulse space-y-4 bg-[#111318] transition-all duration-300">
      <div className="h-8 bg-slate-800/80 rounded w-1/3"></div>
      <div className="h-4 bg-slate-800/60 rounded w-1/4"></div>
      <div className="border-t border-slate-800 pt-4 space-y-3">
        <div className="h-4 bg-slate-800/50 rounded w-full"></div>
        <div className="h-4 bg-slate-800/50 rounded w-5/6"></div>
        <div className="h-4 bg-slate-800/50 rounded w-2/3"></div>
        <div className="h-4 bg-slate-800/50 rounded w-full"></div>
      </div>
    </div>
  );
}

function FolderSkeleton() {
  return (
    <div className="flex h-full flex-col p-6 animate-pulse space-y-4 bg-[#111318] transition-all duration-300">
      <div className="h-6 bg-slate-800/85 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-800/50 rounded-lg"></div>
        ))}
      </div>
    </div>
  );
}

export function VaultDashboard({
  userId,
  initialFolders,
  initialNotes,
  initialMediaAssets,
  initialTags,
  initialDeletedFolders,
  initialDeletedNotes,
  initialDeletedMediaAssets,
  initialSearchParams,
}: VaultDashboardProps) {
  const [folders, setFolders] = useState<FolderListEntry[]>(initialFolders);
  const [notes, setNotes] = useState<NoteListEntry[]>(initialNotes);
  const [mediaAssets, setMediaAssets] = useState<MediaListEntry[]>(initialMediaAssets);
  const [tags] = useState<TagEntry[]>(initialTags);
  const [deletedFolders, setDeletedFolders] = useState<DeletedFolderEntry[]>(initialDeletedFolders);
  const [deletedNotes, setDeletedNotes] = useState<DeletedNoteEntry[]>(initialDeletedNotes);
  const [deletedMediaAssets, setDeletedMediaAssets] = useState<DeletedMediaEntry[]>(initialDeletedMediaAssets);

  // Client Selection State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialSearchParams?.folder ?? null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialSearchParams?.note ?? null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(initialSearchParams?.media ?? null);
  const [activeView, setActiveView] = useState<string | null>(initialSearchParams?.view ?? null);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchParams?.q ?? "");
  const [activeTagSlug, setActiveTagSlug] = useState<string>(initialSearchParams?.tag ?? "");

  const [selectedNoteDetails, setSelectedNoteDetails] = useState<NoteListEntry | null>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [isFolderLoading, setIsFolderLoading] = useState(false);

  const [textPreviewContent, setTextPreviewContent] = useState("");

  const isTrashView = activeView === "trash";
  const isFilteredView = !isTrashView && Boolean(searchQuery || activeTagSlug);
  const renderKey = new Date().getTime();

  // Listen to popstate and vault-navigate events
  useEffect(() => {
    const handleUrlUpdate = (urlStr: string) => {
      const url = new URL(urlStr, window.location.origin);
      const params = url.searchParams;
      
      const folderId = params.get("folder");
      const noteId = params.get("note");
      const mediaId = params.get("media");
      const view = params.get("view");
      const q = params.get("q") ?? "";
      const tag = params.get("tag") ?? "";
      
      setSelectedFolderId(folderId);
      setSelectedNoteId(noteId);
      setSelectedMediaId(mediaId);
      setActiveView(view);
      setSearchQuery(q);
      setActiveTagSlug(tag);
    };

    const handlePopState = () => {
      handleUrlUpdate(window.location.href);
    };

    const handleCustomNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string }>;
      if (customEvent.detail?.url) {
        handleUrlUpdate(customEvent.detail.url);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("vault-navigate", handleCustomNavigate);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("vault-navigate", handleCustomNavigate);
    };
  }, []);

  // Intercept relative link clicks for shallow routing
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      
      const href = anchor.getAttribute("href");
      if (!href) return;
      
      if (anchor.target === "_blank") return;
      
      if (href === "/" || href.startsWith("/?") || href.startsWith("/")) {
        if (href.startsWith("/api") || href.startsWith("/login") || href.startsWith("/auth")) return;
        
        e.preventDefault();
        window.history.pushState(null, "", href);
        window.dispatchEvent(new CustomEvent("vault-navigate", { detail: { url: href } }));
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // Intercept client-side mutations for Optimistic Updates
  useEffect(() => {
    const handleMutation = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type: string;
        folderId?: string;
        noteId?: string;
        mediaAssetId?: string;
        name?: string;
        parentId?: string | null;
        color?: string | null;
        isPinned?: boolean;
        checkboxIndex?: number;
        checked?: boolean;
      }>;
      
      const { type, folderId, noteId, mediaAssetId, name, parentId, color, isPinned, checkboxIndex, checked } = customEvent.detail;

      if (type === "rename-folder" && folderId && name) {
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name } : f));
      }
      else if (type === "move-folder" && folderId) {
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, parentId: parentId ?? null } : f));
      }
      else if (type === "trash-folder" && folderId) {
        const folderToTrash = folders.find(f => f.id === folderId);
        setFolders(prev => prev.filter(f => f.id !== folderId));
        if (folderToTrash) {
          setDeletedFolders(prev => [
            { ...folderToTrash, deletedAt: new Date() },
            ...prev
          ]);
        }
      }
      else if (type === "rename-note" && noteId && name) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, title: name } : n));
        if (selectedNoteDetails?.id === noteId) {
          setSelectedNoteDetails((prev) => prev ? { ...prev, title: name } : null);
        }
      }
      else if (type === "move-note" && noteId) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId: parentId ?? null } : n));
      }
      else if (type === "trash-note" && noteId) {
        const noteToTrash = notes.find(n => n.id === noteId);
        setNotes(prev => prev.filter(n => n.id !== noteId));
        if (noteToTrash) {
          setDeletedNotes(prev => [
            { ...noteToTrash, deletedAt: new Date() },
            ...prev
          ]);
        }
        if (selectedNoteId === noteId) {
          setSelectedNoteId(null);
        }
      }
      else if (type === "rename-media" && mediaAssetId && name) {
        setMediaAssets(prev => prev.map(m => m.id === mediaAssetId ? { ...m, filename: name } : m));
      }
      else if (type === "move-media" && mediaAssetId) {
        setMediaAssets(prev => prev.map(m => m.id === mediaAssetId ? { ...m, folderId: parentId ?? null } : m));
      }
      else if (type === "trash-media" && mediaAssetId) {
        const mediaToTrash = mediaAssets.find(m => m.id === mediaAssetId);
        setMediaAssets(prev => prev.filter(m => m.id !== mediaAssetId));
        if (mediaToTrash) {
          setDeletedMediaAssets(prev => [
            { ...mediaToTrash, deletedAt: new Date() },
            ...prev
          ]);
        }
        if (selectedMediaId === mediaAssetId) {
          setSelectedMediaId(null);
        }
      }
      else if (type === "update-keep-note" && noteId) {
        setNotes(prev => prev.map(n => {
          if (n.id !== noteId) return n;
          const updated: NoteListEntry = {
            ...n,
            updatedAt: new Date(),
            color: color !== undefined ? color : n.color,
            isPinned: isPinned !== undefined ? isPinned : n.isPinned,
            title: name !== undefined ? name : n.title,
          };
          return updated;
        }));
      }
      else if (type === "toggle-keep-checklist" && noteId && checkboxIndex !== undefined && checked !== undefined) {
        setNotes(prev => prev.map(n => {
          if (n.id !== noteId) return n;
          return {
            ...n,
            body: toggleMarkdownCheckbox(n.body, checkboxIndex, checked),
            updatedAt: new Date(),
          };
        }));
      }
    };

    window.addEventListener("vault-mutate", handleMutation);
    return () => window.removeEventListener("vault-mutate", handleMutation);
  }, [folders, notes, mediaAssets, selectedNoteId, selectedMediaId, selectedNoteDetails]);

  // Fetch selected note details dynamically
  useEffect(() => {
    if (!selectedNoteId) {
      setSelectedNoteDetails(null);
      return;
    }
    
    if (selectedNoteDetails?.id === selectedNoteId) return;

    let active = true;
    setIsNoteLoading(true);
    fetch(`/api/notes/${selectedNoteId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch note details");
        return res.json();
      })
      .then((data: NoteListEntry) => {
        if (active) {
          setSelectedNoteDetails(data);
        }
      })
      .catch((err) => console.error("Error fetching note details:", err))
      .finally(() => {
        if (active) setIsNoteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedNoteId, selectedNoteDetails?.id]);

  // Fetch selected folder details dynamically
  useEffect(() => {
    if (!selectedFolderId) return;

    let active = true;
    setIsFolderLoading(true);
    fetch(`/api/folders/${selectedFolderId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch folder details");
        return res.json();
      })
      .then(() => {
        if (active) {
          // Merge dynamic data in client state if appropriate
        }
      })
      .catch((err) => console.error("Error fetching folder details:", err))
      .finally(() => {
        if (active) setIsFolderLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFolderId]);

  // Fetch text file content preview if media is text type
  const activeMedia = selectedMediaId
    ? mediaAssets.find(m => m.id === selectedMediaId) || deletedMediaAssets.find(m => m.id === selectedMediaId)
    : null;

  useEffect(() => {
    if (!activeMedia) {
      setTextPreviewContent("");
      return;
    }

    const previewKind = getMediaPreviewKind(activeMedia.contentType);
    if (previewKind === "text") {
      const url = getMediaAssetUrl(activeMedia.r2Key);
      if (url) {
        fetch(url)
          .then((res) => res.text())
          .then((text) => setTextPreviewContent(text))
          .catch((err) => {
            setTextPreviewContent(`Error loading text content: ${err instanceof Error ? err.message : String(err)}`);
          });
      }
    }
  }, [activeMedia]);

  const activeTag = activeTagSlug
    ? tags.find((tag) => tag.slug === activeTagSlug) ?? null
    : null;

  const selectedFolder = selectedFolderId
    ? folders.find((folder) => folder.id === selectedFolderId) ?? null
    : null;

  const resolveDisplayMarkdown = (body: string) => {
    return body.replace(/filebucket-media:([a-zA-Z0-9]+)/g, (match, mediaId) => {
      const media = mediaAssets.find((m) => m.id === mediaId) || deletedMediaAssets.find((m) => m.id === mediaId);
      return media ? (getMediaAssetUrl(media.r2Key) ?? match) : match;
    });
  };

  const selectedNote = selectedNoteDetails || (selectedNoteId ? notes.find((note) => note.id === selectedNoteId) ?? null : null);
  const selectedMedia = selectedMediaId ? mediaAssets.find((mediaAsset) => mediaAsset.id === selectedMediaId) ?? null : null;

  const selectedDeletedFolder = isTrashView && selectedFolderId
    ? deletedFolders.find((folder) => folder.id === selectedFolderId) ?? null
    : null;
  const selectedDeletedNote = isTrashView && selectedNoteId
    ? deletedNotes.find((note) => note.id === selectedNoteId) ?? null
    : null;
  const selectedDeletedMedia = isTrashView && selectedMediaId
    ? deletedMediaAssets.find((mediaAsset) => mediaAsset.id === selectedMediaId) ?? null
    : null;

  const matchingFolders = searchQuery && !activeTag
    ? folders.filter((folder) => folder.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const folderTrail = getFolderTrail(folders, selectedFolder);
  const noteOutline = selectedNote ? getNoteOutline(selectedNote.body) : [];
  const browserTitle = isTrashView
    ? "Trash"
    : activeTag
      ? `#${activeTag.name}`
      : searchQuery
        ? "Search results"
        : selectedFolder?.name ?? "Vault";
  const hasVaultContent = folders.length > 0 || notes.length > 0 || mediaAssets.length > 0;

  const currentPathParams = new URLSearchParams();
  if (selectedFolderId) currentPathParams.set("folder", selectedFolderId);
  if (selectedNoteId) currentPathParams.set("note", selectedNoteId);
  if (selectedMediaId) currentPathParams.set("media", selectedMediaId);
  if (searchQuery) currentPathParams.set("q", searchQuery);
  if (activeTagSlug) currentPathParams.set("tag", activeTagSlug);

  const returnTo = `/${currentPathParams.toString() ? `?${currentPathParams.toString()}` : ""}`;

  const activeContentTab = selectedNote
    ? {
        id: selectedNote.id,
        type: "note" as const,
        title: selectedNote.title,
        href: getContentHref({
          folderId: selectedNote.folder?.id ?? selectedNote.folderId ?? null,
          noteId: selectedNote.id,
          query: searchQuery,
          tagSlug: activeTagSlug,
        }),
      }
    : selectedMedia
      ? {
          id: selectedMedia.id,
          type: "media" as const,
          title: selectedMedia.filename,
          href: getContentHref({
            folderId: selectedMedia.folder?.id ?? selectedMedia.folderId ?? null,
            mediaId: selectedMedia.id,
            query: searchQuery,
          }),
        }
      : selectedDeletedNote
        ? {
            id: selectedDeletedNote.id,
            type: "note" as const,
            title: selectedDeletedNote.title,
            href: `/?view=trash&note=${selectedDeletedNote.id}`,
          }
        : selectedDeletedMedia
          ? {
              id: selectedDeletedMedia.id,
              type: "media" as const,
              title: selectedDeletedMedia.filename,
              href: `/?view=trash&media=${selectedDeletedMedia.id}`,
            }
          : selectedDeletedFolder
            ? {
                id: selectedDeletedFolder.id,
                type: "folder" as const,
                title: selectedDeletedFolder.name,
                href: `/?view=trash&folder=${selectedDeletedFolder.id}`,
              }
            : undefined;

  const existingIds = [
    ...folders.map((f) => f.id),
    ...notes.map((n) => n.id),
    ...mediaAssets.map((m) => m.id),
    ...deletedFolders.map((f) => f.id),
    ...deletedNotes.map((n) => n.id),
    ...deletedMediaAssets.map((m) => m.id),
  ];

  const contentFallbackHref = getContentHref({
    folderId: selectedNote?.folder?.id ?? selectedNote?.folderId ?? selectedMedia?.folder?.id ?? selectedMedia?.folderId ?? selectedFolder?.id ?? null,
    query: searchQuery,
    tagSlug: activeTagSlug,
  });
  
  const trashCount = deletedFolders.length + deletedNotes.length + deletedMediaAssets.length;
  const folderRows = flattenFolders(folders);
  const folderDestinations = folderRows.map(({ folder, depth }) => ({
    id: folder.id,
    name: `${"  ".repeat(depth)}${folder.name}`,
  }));
  const isVaultRootActive = !isTrashView && !selectedFolder && !selectedNote && !selectedMedia;

  const imageMediaAssets = !isTrashView
    ? mediaAssets
        .filter((m) => m.contentType.startsWith("image/"))
        .map((m) => ({
          id: m.id,
          filename: m.filename,
          location: m.folder?.name ?? "Vault",
          url: getMediaAssetUrl(m.r2Key) ?? "",
          folderId: m.folderId,
        }))
    : [];

  const deletedFolderContents: [
    { id: string; name: string; deletedAt: Date | string | null }[],
    { id: string; title: string; deletedAt: Date | string | null }[],
    { id: string; filename: string; contentType: string; deletedAt: Date | string | null }[]
  ] | null = selectedDeletedFolder
    ? [
        deletedFolders.filter((f) => f.parentId === selectedDeletedFolder.id).map(f => ({ id: f.id, name: f.name, deletedAt: f.deletedAt })),
        deletedNotes.filter((n) => n.folderId === selectedDeletedFolder.id).map(n => ({ id: n.id, title: n.title, deletedAt: n.deletedAt })),
        deletedMediaAssets.filter((m) => m.folderId === selectedDeletedFolder.id).map(m => ({ id: m.id, filename: m.filename, contentType: m.contentType, deletedAt: m.deletedAt })),
      ]
    : null;

  const notesRoot = folders.find((f) => f.type === "NOTES_ROOT");
  const keepRoot = folders.find((f) => f.type === "KEEP_ROOT");
  const chatRoot = folders.find((f) => f.type === "CHAT_ROOT");

  const notesRootId = notesRoot?.id ?? null;
  const keepRootId = keepRoot?.id ?? null;
  const chatRootId = chatRoot?.id ?? null;

  const activeMode = isTrashView
    ? "TRASH" as const
    : resolveViewMode({
        selectedFolderId: selectedFolderId,
        selectedNoteId: selectedNoteId,
        selectedMediaId: selectedMediaId,
        folders,
        notes,
        mediaAssets,
      });

  const folderMapForKeep = new Map(folders.map((f) => [f.id, f]));
  const keepNotes = notes.filter((note) => {
    if (!keepRootId) return false;
    let currentId = note.folderId;
    while (currentId) {
      if (currentId === keepRootId) return true;
      const parent = folderMapForKeep.get(currentId);
      currentId = parent ? parent.parentId : null;
    }
    return false;
  }).map((note) => ({
    id: note.id,
    title: note.title,
    body: note.body,
    color: note.color,
    isPinned: note.isPinned,
    updatedAt: new Date(note.updatedAt),
    tags: note.tags.map((nt) => ({
      tag: {
        id: nt.tag.id,
        name: nt.tag.name,
        slug: nt.tag.slug,
      },
    })),
  }));

  return (
    <main className="h-full overflow-hidden bg-[#0d0d11] text-slate-100">
      <GlobalLoader renderKey={renderKey} />
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex min-h-14 flex-col gap-3 border-b border-slate-800/40 bg-[#101015]/60 backdrop-blur-md px-4 py-2.5 md:flex-row md:items-center md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <HeaderHamburger />
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 border border-blue-500/25 shadow-[0_0_10px_rgba(59,130,246,0.15)] overflow-hidden">
              <img src="/icon.svg" alt="Filebucket" className="h-6.5 w-6.5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-normal text-slate-50">Filebucket</h1>
              <p className="truncate text-xs text-slate-400">Personal note and file vault</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-auto w-full md:ml-12 md:mr-auto">
            <SearchInput defaultValue={searchQuery} disabled={isTrashView} />
          </div>

          <div className="hidden md:block w-28" />
        </header>

        <div className="flex flex-col-reverse md:flex-row flex-1 min-h-0 overflow-hidden">
          <ActivityBar
            activeMode={activeMode}
            notesRootId={notesRootId}
            keepRootId={keepRootId}
            chatRootId={chatRootId}
          />
          <ResizableVault
            browser={
              <SidebarBrowser
                userId={userId}
                isTrashView={isTrashView}
                query={searchQuery}
                activeTagSlug={activeTagSlug}
                activeTag={activeTag}
                selectedFolder={selectedFolder}
                selectedNote={selectedNote}
                selectedMedia={selectedMedia}
                selectedDeletedFolder={selectedDeletedFolder}
                selectedDeletedNote={selectedDeletedNote}
                selectedDeletedMedia={selectedDeletedMedia}
                folders={folders}
                deletedFolders={deletedFolders}
                deletedNotes={deletedNotes}
                deletedMediaAssets={deletedMediaAssets}
                tags={tags}
                notes={notes}
                mediaAssets={mediaAssets}
                folderTrail={folderTrail}
                folderDestinations={folderDestinations}
                matchingFolders={matchingFolders}
                isFilteredView={isFilteredView}
                isVaultRootActive={isVaultRootActive}
                browserTitle={browserTitle}
                trashCount={trashCount}
                returnTo={returnTo}
                activeMode={activeMode}
              />
            }
            content={
              <section
                key="vault-content-pane"
                className="h-full min-h-0 overflow-hidden bg-[#111318] text-slate-100 transition-all duration-300"
              >
                <MainContentTabs
                  activeTab={activeContentTab}
                  existingIds={existingIds}
                  fallbackHref={contentFallbackHref}
                  activeMode={activeMode}
                >
                  {isTrashView ? (
                    <TrashWorkspace
                      selectedDeletedNote={selectedDeletedNote}
                      selectedDeletedMedia={selectedDeletedMedia}
                      selectedDeletedFolder={selectedDeletedFolder}
                      deletedFolderContents={deletedFolderContents}
                      textPreviewContent={textPreviewContent}
                      resolveDisplayMarkdown={resolveDisplayMarkdown}
                    />
                  ) : activeMode === "KEEP" ? (
                    <KeepWorkspace
                      notes={keepNotes}
                      keepRootId={keepRootId!}
                      allTags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
                      activeTagSlug={activeTagSlug}
                      query={searchQuery}
                    />
                  ) : activeMode === "CHAT" ? (
                    <ChatWorkspace
                      activeChannel={selectedFolder}
                      sessionUserId={userId}
                      chatRootId={chatRootId!}
                    />
                  ) : isFolderLoading && !selectedFolder ? (
                    <FolderSkeleton />
                  ) : isNoteLoading && !selectedNote ? (
                    <NoteSkeleton />
                  ) : (
                    <ActiveWorkspace
                      selectedNote={
                        selectedNote
                          ? {
                              ...selectedNote,
                              body: resolveDisplayMarkdown(selectedNote.body),
                            }
                          : null
                      }
                      selectedMedia={selectedMedia}
                      selectedFolder={selectedFolder}
                      folderTrail={folderTrail}
                      folderDestinations={folderDestinations}
                      imageMediaAssets={imageMediaAssets}
                      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
                      textPreviewContent={textPreviewContent}
                      hasVaultContent={hasVaultContent}
                      browserTitle={browserTitle}
                      allMediaAssets={mediaAssets}
                      allFolders={folders}
                      allNotes={notes}
                    />
                  )}
                </MainContentTabs>
              </section>
            }
            outline={selectedNote && !isTrashView ? (
              <aside
                key={`note-outline-${selectedNote.id}`}
                className="flex h-full min-h-0 flex-col border-l border-slate-800 bg-[#171a20] text-slate-100"
              >
                <div className="border-b border-slate-800 px-4 py-4">
                  <h2 className="text-sm font-semibold text-slate-100">Note Outline</h2>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  {noteOutline.length > 0 ? (
                    <div className="space-y-1">
                      {noteOutline.map((heading) => (
                        <div
                          key={heading.id}
                          className="truncate rounded-md px-2 py-1.5 text-sm text-slate-400"
                          style={{ paddingLeft: `${8 + (heading.depth - 1) * 12}px` }}
                        >
                          {heading.title}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-2 py-1.5 text-sm text-slate-500">No headings</p>
                  )}
                </div>
              </aside>
            ) : null}
          />
        </div>
      </div>
    </main>
  );
}

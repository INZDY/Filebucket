"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Plus, 
  Trash2, 
  Loader2, 
  Download, 
  FileText, 
  BookOpen, 
  X,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPresignedUploadUrlAction } from "@/app/media/actions";
import { createChatAttachmentAction } from "@/app/media/actions";
import { MangaReader, type ReaderPage } from "@/components/manga-reader";
import { getMediaAssetUrl } from "@/lib/utils";

interface MediaAsset {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string;
}

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  folderId: string;
  createdAt: string;
  mediaAssets: MediaAsset[];
  user: {
    name: string | null;
    email: string;
  };
}

interface ChatWorkspaceProps {
  activeChannel: {
    id: string;
    name: string;
    parentId: string | null;
  } | null;
  sessionUserId: string;
  chatRootId: string;
}

export function ChatWorkspace({ activeChannel, sessionUserId, chatRootId }: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  
  // Pending attachments to upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // Touch gestures for swipe-right drawer trigger
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  
  // Manga Reader Integration
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerPages, setReaderPages] = useState<ReaderPage[]>([]);
  const [readerTitle, setReaderTitle] = useState("");
  const [readerInitialIndex, setReaderInitialIndex] = useState(0);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAtRoot = !activeChannel || activeChannel.id === chatRootId;

  // 1. Fetch messages on channel selection
  useEffect(() => {
    if (isAtRoot) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chat?folderId=${activeChannel!.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Failed to load chat messages", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMessages();
  }, [activeChannel, isAtRoot]);

  // 2. Auto-scroll to bottom of message list on updates
  useEffect(() => {
    if (messageEndRef.current && typeof messageEndRef.current.scrollIntoView === "function") {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-expand textarea content input
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "40px";
      const nextHeight = Math.min(textarea.scrollHeight, 144);
      textarea.style.height = `${nextHeight}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 640;
      if (!isMobileViewport && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  // 3. Format Date / Timestamp
  function formatTimestamp(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    if (d.toDateString() === today.toDateString()) {
      return `Today at ${timeStr}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${timeStr}`;
    } else {
      return `${d.toLocaleDateString()} ${timeStr}`;
    }
  }

  // 4. File sizing format
  function formatSize(bytes: number) {
    if (bytes >= 1024 * 1024) {
      return `${Math.round(bytes / 1024 / 1024)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  // 5. Send message (upload attachments first if any)
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (isAtRoot || isSending) return;
    if (!content.trim() && pendingFiles.length === 0) return;

    setIsSending(true);
    try {
      const mediaAssetIds: string[] = [];

      // Upload files sequentially
      for (const file of pendingFiles) {
        const { uploadUrl, r2Key } = await getPresignedUploadUrlAction(file.name, file.type);
        
        // Upload to R2 storage
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadRes.ok) {
          throw new Error(`R2 upload failed: ${uploadRes.statusText}`);
        }

        // Write metadata
        const asset = await createChatAttachmentAction({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          r2Key,
        });

        mediaAssetIds.push(asset.id);
      }

      // Submit message
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          folderId: activeChannel!.id,
          mediaAssetIds,
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setContent("");
        setPendingFiles([]);
      }
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message or upload attachments.");
    } finally {
      setIsSending(false);
    }
  }

  // 6. Delete message
  async function handleDelete(messageId: string) {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const res = await fetch(`/api/chat?messageId=${messageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  }

  // 7. Auto-hyperlinker
  function renderMessageContent(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }

  // 8. Loose images sequency
  const getLooseImagesInHistory = () => {
    const images: MediaAsset[] = [];
    messages.forEach((msg) => {
      msg.mediaAssets?.forEach((asset) => {
        if (asset.contentType.startsWith("image/")) {
          images.push(asset);
        }
      });
    });
    return images;
  };

  const handleImageClick = (clickedAsset: MediaAsset) => {
    const looseImages = getLooseImagesInHistory();
    const index = looseImages.findIndex((img) => img.id === clickedAsset.id);
    
    // Restore page progress from localStorage if it exists
    const storedProgress = localStorage.getItem(`manga-progress:${clickedAsset.id}`);
    const initialIndex = storedProgress ? parseInt(storedProgress, 10) : (index >= 0 ? index : 0);

    setReaderPages(
      looseImages.map((img) => ({
        name: img.filename,
        url: getMediaAssetUrl(img.r2Key),
      }))
    );
    setReaderTitle("Channel Feed Images");
    setReaderInitialIndex(initialIndex >= 0 && initialIndex < looseImages.length ? initialIndex : (index >= 0 ? index : 0));
    setActiveMediaId(clickedAsset.id);
    setIsReaderOpen(true);
  };

  const handleZipClick = async (clickedAsset: MediaAsset) => {
    const previewUrl = getMediaAssetUrl(clickedAsset.r2Key);
    setIsArchiveLoading(true);

    try {
      const { parseMangaArchive } = await import("@/lib/manga");
      const res = await fetch(previewUrl);
      if (!res.ok) {
        throw new Error(`Failed to download archive: ${res.statusText}`);
      }
      const buffer = await res.arrayBuffer();
      const parsedPages = await parseMangaArchive(buffer);
      if (parsedPages.length === 0) {
        throw new Error("No readable image pages found in the archive.");
      }

      // Restore page progress from localStorage
      const storedProgress = localStorage.getItem(`manga-progress:${clickedAsset.id}`);
      const initialIndex = storedProgress ? parseInt(storedProgress, 10) : 0;

      setReaderPages(parsedPages);
      setReaderTitle(clickedAsset.filename);
      setReaderInitialIndex(initialIndex >= 0 && initialIndex < parsedPages.length ? initialIndex : 0);
      setActiveMediaId(clickedAsset.id);
      setIsReaderOpen(true);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to load archive in Manga Reader.");
    } finally {
      setIsArchiveLoading(false);
    }
  };

  // 9. Mobile Touch/Swipe event triggers for drawer opening
  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX;

    // Detect substantial swipe-right
    if (diffX > 75) {
      window.dispatchEvent(new CustomEvent("open-sidebar"));
    }
    setTouchStartX(null);
  }

  return (
    <div 
      className="flex h-full min-h-0 flex-col bg-[#111318]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Header panel */}
      <div className="flex h-12 items-center justify-between border-b border-slate-800/60 bg-[#14161f]/80 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-5 w-5 text-purple-400 shrink-0" />
          <span className="font-semibold text-slate-100 truncate">
            {isAtRoot ? "Chat Channels" : activeChannel!.name}
          </span>
          {!isAtRoot && (
            <span className="hidden md:inline text-xs text-slate-500 truncate max-w-[200px]">
              - chronological stream for text and media uploads
            </span>
          )}
        </div>
      </div>

      {/* 2. Messages lists / Empty state */}
      <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
        {isAtRoot ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 mb-4 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Welcome to Chat Channels</h3>
            <p className="mt-1 text-sm text-slate-400 max-w-sm">
              Select a channel from the sidebar list, or create a new folder under Chat Channels to start messaging.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <p className="text-sm text-slate-500">No messages in this channel yet.</p>
            <p className="mt-1 text-xs text-slate-600">Be the first to post something!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className="group flex items-start gap-3 px-4 py-2.5 hover:bg-slate-800/15 transition-all duration-150 relative border-l-2 border-transparent hover:border-purple-500/35"
            >
              {/* User Avatar Initial */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600/10 text-purple-400 text-sm font-semibold border border-purple-500/15">
                {msg.user?.name?.slice(0, 2).toUpperCase() || msg.user?.email?.slice(0, 2).toUpperCase() || "??"}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm text-slate-100 truncate">
                    {msg.user?.name || msg.user?.email}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatTimestamp(msg.createdAt)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed select-text">
                  {renderMessageContent(msg.content)}
                </div>

                {/* Attachments rendering */}
                {msg.mediaAssets && msg.mediaAssets.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-3">
                    {msg.mediaAssets.map((asset) => {
                      const isImg = asset.contentType.startsWith("image/");
                      if (isImg) {
                        return (
                          <div key={asset.id} className="relative group/img overflow-hidden rounded-lg border border-slate-850">
                            <img
                              src={getMediaAssetUrl(asset.r2Key)}
                              alt={asset.filename}
                              className="max-w-[280px] max-h-[200px] object-cover cursor-pointer hover:scale-[1.01] hover:brightness-95 transition-all duration-200"
                              onClick={() => handleImageClick(asset)}
                            />
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={asset.id} 
                          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#161821]/60 px-3.5 py-2.5 max-w-[320px] hover:bg-[#1a1d29]/80 transition-colors"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-800/80 text-slate-400">
                            {asset.contentType.includes("zip") || asset.filename.endsWith(".cbz") ? (
                              <BookOpen className="h-4.5 w-4.5 text-purple-400" />
                            ) : (
                              <FileText className="h-4.5 w-4.5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-200" title={asset.filename}>
                              {asset.filename}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {formatSize(asset.sizeBytes)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {(asset.contentType.includes("zip") || asset.filename.endsWith(".cbz")) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-purple-400 hover:bg-purple-950/20 hover:text-purple-300"
                                onClick={() => handleZipClick(asset)}
                                title="Read in Manga Reader"
                              >
                                <BookOpen className="h-4 w-4" />
                              </Button>
                            )}
                            <a
                              href={getMediaAssetUrl(asset.r2Key)}
                              download={asset.filename}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                              title="Download attachment"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions Button Panel */}
              {msg.userId === sessionUserId && (
                <div className="absolute right-3 top-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                    onClick={() => handleDelete(msg.id)}
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messageEndRef} />
      </div>

      {/* 3. Message Input Control Bar */}
      {!isAtRoot && (
        <form onSubmit={handleSend} className="border-t border-slate-800/60 bg-[#13151b] px-4 py-3">
          {/* Pending files list preview wrapper */}
          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingFiles.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 rounded-md bg-[#1d202b] border border-slate-700/65 px-2.5 py-1 text-xs text-slate-200"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-100"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Upload attachment trigger button */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 border-slate-700 bg-[#1f242c] hover:bg-slate-850 hover:text-slate-50 text-slate-300 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Add attachment"
              disabled={isSending}
            >
              <Plus className="h-5 w-5" />
            </Button>

            {/* Input message content box */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Message ${activeChannel.name}`}
              className="flex-1 min-h-[40px] max-h-36 py-2 px-3 border border-slate-800 rounded-md bg-[#171a20] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none overflow-y-auto"
              disabled={isSending}
              rows={1}
              onKeyDown={handleKeyDown}
            />

            {/* Send submit button */}
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 bg-purple-600 hover:bg-purple-700 text-white shrink-0 shadow-lg shadow-purple-950/20 active:scale-95 duration-100 transition-transform"
              disabled={isSending || (!content.trim() && pendingFiles.length === 0)}
              title="Send message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}

      {/* 4. Fullscreen Manga Reader / Archive Loader overlays */}
      {isArchiveLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="mt-3 text-sm text-slate-350">Extracting manga pages client-side...</p>
        </div>
      )}

      {isReaderOpen && (
        <MangaReader
          isOpen={isReaderOpen}
          onClose={() => {
            setIsReaderOpen(false);
            setReaderPages([]);
            setActiveMediaId(null);
          }}
          title={readerTitle}
          pages={readerPages}
          initialPageIndex={readerInitialIndex}
          onPageChange={(idx) => {
            if (activeMediaId) {
              localStorage.setItem(`manga-progress:${activeMediaId}`, idx.toString());
            }
          }}
        />
      )}
    </div>
  );
}

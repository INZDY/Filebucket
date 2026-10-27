"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ReaderContainer,
  ReaderHeader,
  ReaderFooter,
  useReaderOverlay,
  useReaderSwipe,
} from "./reader-shared";

export type ReaderPage = {
  name: string;
  url?: string;
  load?: () => Promise<string>;
};

export type MangaReaderProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pages: ReaderPage[];
  initialPageIndex?: number;
  onPageChange?: (index: number) => void;
  /** When set, reading progress is saved to and restored from the media progress API. */
  mediaId?: string;
};

export function MangaReader({
  isOpen,
  onClose,
  title,
  pages,
  initialPageIndex = 0,
  onPageChange,
  mediaId,
}: MangaReaderProps) {
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [layoutMode, setLayoutMode] = useState<"webtoon" | "paged-ltr" | "paged-rtl">("paged-ltr");
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState<"width" | "height" | "original">("height");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageInput, setPageInput] = useState(String(initialPageIndex + 1));

  // Reading progress persistence
  const [progressLoaded, setProgressLoaded] = useState(false);
  const lastSavedRef = useRef<{ position: string; percentage: number } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const webtoonScrollRef = useRef<HTMLDivElement>(null);
  const webtoonRestoredRef = useRef(false);
  const webtoonFrameRef = useRef<number | null>(null);

  // Cache of resolved page URLs
  const [resolvedUrls, setResolvedUrls] = useState<Record<number, string>>({});
  const resolvedUrlsRef = useRef<Record<number, string>>({});
  const objectUrlsRef = useRef<string[]>([]);
  const pagesRef = useRef(pages);
  const prevPagesLengthRef = useRef(pages.length);
  const prevFirstPageNameRef = useRef(pages[0]?.name);

  // Hooks for overlay and swipe
  const { isUiVisible, toggleUiVisibility } = useReaderOverlay(true);

  // Sync pages ref and handle page changes
  useEffect(() => {
    pagesRef.current = pages;
    const pagesChanged =
      pages.length !== prevPagesLengthRef.current ||
      pages[0]?.name !== prevFirstPageNameRef.current;

    if (pagesChanged) {
      // Revoke any previous object URLs
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      });
      objectUrlsRef.current = [];
      resolvedUrlsRef.current = {};
      setResolvedUrls({});
      webtoonRestoredRef.current = false;
      prevPagesLengthRef.current = pages.length;
      prevFirstPageNameRef.current = pages[0]?.name;
    }
  }, [pages]);

  const [isLoading, setIsLoading] = useState(false);

  // Sync initialPageIndex
  useEffect(() => {
    setPageIndex(initialPageIndex);
  }, [initialPageIndex]);

  // Keep the page jump input in sync with the active page
  useEffect(() => {
    setPageInput(String(pageIndex + 1));
  }, [pageIndex]);

  // Notify page changes
  useEffect(() => {
    onPageChange?.(pageIndex);
  }, [pageIndex, onPageChange]);

  const progressPercentage = pages.length > 1 ? (pageIndex / (pages.length - 1)) * 100 : 0;

  // Fetch saved reading progress
  useEffect(() => {
    if (!isOpen) return;

    if (!mediaId) {
      setProgressLoaded(true);
      return;
    }

    let active = true;
    setProgressLoaded(false);
    lastSavedRef.current = null;
    webtoonRestoredRef.current = false;

    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/media/progress?mediaAssetId=${mediaId}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data) {
            if (data.settings?.mangaLayoutMode) {
              setLayoutMode(data.settings.mangaLayoutMode);
            }
            if (data.position !== undefined && data.position !== null) {
              const savedIndex = Math.floor(Number(data.position));
              if (Number.isFinite(savedIndex) && savedIndex >= 0) {
                setPageIndex(savedIndex);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load manga progress:", err);
      } finally {
        if (active) setProgressLoaded(true);
      }
    };

    fetchProgress();
    return () => {
      active = false;
    };
  }, [isOpen, mediaId]);

  // Save reading progress to the server
  const saveProgress = useCallback(
    async (index: number) => {
      if (!mediaId) return;
      const pct = parseFloat(
        (pages.length > 1 ? (index / (pages.length - 1)) * 100 : 0).toFixed(1)
      );
      const position = String(index);
      if (
        lastSavedRef.current &&
        lastSavedRef.current.position === position &&
        lastSavedRef.current.percentage === pct
      ) {
        return;
      }
      lastSavedRef.current = { position, percentage: pct };
      try {
        await fetch("/api/media/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaAssetId: mediaId,
            position,
            percentage: pct,
            settings: { mangaLayoutMode: layoutMode },
          }),
        });
      } catch (err) {
        console.error("Failed to save manga progress:", err);
      }
    },
    [mediaId, pages.length, layoutMode]
  );

  // Debounced save
  useEffect(() => {
    if (!isOpen || !mediaId || !progressLoaded || pages.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress(pageIndex);
    }, 1500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isOpen, mediaId, progressLoaded, pageIndex, pages.length, saveProgress]);

  // Guard against saved or initial indexes beyond the page list
  useEffect(() => {
    if (pages.length === 0) return;
    if (pageIndex > pages.length - 1) {
      setPageIndex(pages.length - 1);
    }
  }, [pages.length, pageIndex]);

  // Restore the webtoon scroll position to the saved page
  useEffect(() => {
    if (!isOpen || !progressLoaded || layoutMode !== "webtoon" || webtoonRestoredRef.current) {
      return;
    }
    const container = webtoonScrollRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`[data-manga-page="${pageIndex}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    webtoonRestoredRef.current = true;
  }, [isOpen, progressLoaded, layoutMode, pageIndex]);

  // Track the page currently in view while scrolling webtoon mode
  const handleWebtoonScroll = useCallback(() => {
    if (webtoonFrameRef.current !== null) return;
    webtoonFrameRef.current = requestAnimationFrame(() => {
      webtoonFrameRef.current = null;
      const container = webtoonScrollRef.current;
      if (!container) return;
      const probe = container.getBoundingClientRect().top + container.clientHeight * 0.35;
      const pageElements = Array.from(
        container.querySelectorAll<HTMLElement>("[data-manga-page]")
      );
      for (const el of pageElements) {
        if (el.getBoundingClientRect().bottom >= probe) {
          const index = Number(el.dataset.mangaPage);
          if (Number.isFinite(index) && index !== pageIndex) setPageIndex(index);
          break;
        }
      }
    });
  }, [pageIndex]);

  useEffect(() => {
    return () => {
      if (webtoonFrameRef.current !== null) cancelAnimationFrame(webtoonFrameRef.current);
    };
  }, []);

  // Handle URL resolve
  const resolvePageUrl = useCallback(async (idx: number): Promise<string> => {
    if (resolvedUrlsRef.current[idx]) return resolvedUrlsRef.current[idx];
    const page = pagesRef.current[idx];
    if (!page) return "";

    if (page.url) {
      resolvedUrlsRef.current[idx] = page.url;
      setResolvedUrls((prev) => ({ ...prev, [idx]: page.url! }));
      return page.url;
    }

    if (page.load) {
      const url = await page.load();
      resolvedUrlsRef.current[idx] = url;
      if (url.startsWith("blob:")) {
        objectUrlsRef.current.push(url);
      }
      setResolvedUrls((prev) => ({ ...prev, [idx]: url }));
      return url;
    }

    return "";
  }, []);

  // Load current page in Paged Mode
  useEffect(() => {
    if (!isOpen || layoutMode === "webtoon") return;

    let active = true;
    setIsLoading(true);

    resolvePageUrl(pageIndex)
      .then(() => {
        if (active) setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading manga page:", err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pageIndex, layoutMode, isOpen, resolvePageUrl]);

  // Prefetch next and previous pages in the background
  useEffect(() => {
    if (!isOpen || layoutMode === "webtoon") return;

    // Prefetch next page
    if (pageIndex < pages.length - 1) {
      resolvePageUrl(pageIndex + 1).catch(() => {});
    }
    // Prefetch previous page
    if (pageIndex > 0) {
      resolvePageUrl(pageIndex - 1).catch(() => {});
    }
  }, [pageIndex, isOpen, layoutMode, pages.length, resolvePageUrl]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      });
      objectUrlsRef.current = [];
    };
  }, []);

  // Page turns handlers
  const handleNext = useCallback(() => {
    if (pageIndex < pages.length - 1) {
      setPageIndex((p) => p + 1);
    }
  }, [pageIndex, pages.length]);

  const handlePrev = useCallback(() => {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
    }
  }, [pageIndex]);

  const jumpToPage = useCallback(
    (index: number) => {
      if (pages.length === 0) return;
      const clamped = Math.max(0, Math.min(pages.length - 1, index));
      setPageIndex(clamped);
      webtoonRestoredRef.current = true;
      if (layoutMode === "webtoon") {
        requestAnimationFrame(() => {
          webtoonScrollRef.current
            ?.querySelector<HTMLElement>(`[data-manga-page="${clamped}"]`)
            ?.scrollIntoView({ block: "start" });
        });
      }
    },
    [pages.length, layoutMode]
  );

  const commitPageInput = () => {
    const parsed = parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) {
      jumpToPage(parsed - 1);
    } else {
      setPageInput(String(pageIndex + 1));
    }
  };

  const handleSeek = (pct: number) => {
    jumpToPage(Math.round((pct / 100) * (pages.length - 1)));
  };

  // Swipe gesture hook
  const swipeProps = useReaderSwipe({
    onSwipeLeft: layoutMode === "webtoon" ? () => {} : handleNext,
    onSwipeRight: layoutMode === "webtoon" ? () => {} : handlePrev,
    isRtl: layoutMode === "paged-rtl",
  });

  // Tap navigation split zone: Left 30% / Right 30% / Center 40%
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select")) {
      return;
    }

    if (layoutMode === "webtoon") {
      toggleUiVisibility();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const pct = x / width;

    if (pct < 0.3) {
      if (layoutMode === "paged-rtl") {
        handleNext();
      } else {
        handlePrev();
      }
    } else if (pct > 0.7) {
      if (layoutMode === "paged-rtl") {
        handlePrev();
      } else {
        handleNext();
      }
    } else {
      toggleUiVisibility();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (
        target &&
        (target.closest("input") ||
          target.closest("textarea") ||
          target.closest("select") ||
          target.isContentEditable)
      ) {
        return;
      }
      // Let a focused button handle Space itself
      if (e.key === " " && target?.closest("button")) return;

      if (layoutMode === "webtoon") {
        const container = webtoonScrollRef.current;
        if (!container) return;
        if (e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
          e.preventDefault();
          container.scrollBy({ top: container.clientHeight * 0.9, behavior: "smooth" });
        } else if (e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
          e.preventDefault();
          container.scrollBy({ top: -container.clientHeight * 0.9, behavior: "smooth" });
        } else if (e.key === "Home") {
          e.preventDefault();
          container.scrollTo({ top: 0, behavior: "smooth" });
        } else if (e.key === "End") {
          e.preventDefault();
          container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        }
        return;
      }

      if (e.key === "ArrowRight") {
        if (layoutMode === "paged-ltr") handleNext();
        else handlePrev();
      } else if (e.key === "ArrowLeft") {
        if (layoutMode === "paged-ltr") handlePrev();
        else handleNext();
      } else if (e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        if (e.shiftKey) handlePrev();
        else handleNext();
      } else if (e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        jumpToPage(0);
      } else if (e.key === "End") {
        e.preventDefault();
        jumpToPage(pages.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, layoutMode, handleNext, handlePrev, jumpToPage, pages.length]);

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Close handler to clean up object URLs
  const handleClose = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (mediaId && progressLoaded) {
      void saveProgress(pageIndex);
    }
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    });
    objectUrlsRef.current = [];
    saveTimeoutRef.current = null;
    onClose();
  };

  // Zoom handlers
  const zoomIn = () => setZoom((z) => Math.min(z + 10, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 50));
  const resetZoom = () => setZoom(100);

  if (!isOpen) return null;

  return (
    <ReaderContainer isOpen={isOpen} onClose={handleClose}>
      {/* Header Toolbar */}
      <ReaderHeader title={title} onClose={handleClose} isVisible={isUiVisible}>
        {/* Layout Mode Toggles */}
        <div className="flex items-center rounded-md bg-slate-900/80 p-0.5 border border-slate-800/60">
          <Button
            className={cn(
              "h-7 px-2.5 text-xs gap-1 font-medium transition-all active:scale-95",
              layoutMode === "paged-ltr"
                ? "bg-blue-600/90 text-white shadow-md shadow-blue-600/10"
                : "text-slate-400 hover:text-slate-200"
            )}
            onClick={() => setLayoutMode("paged-ltr")}
            variant="ghost"
            size="sm"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">LTR</span>
          </Button>
          <Button
            className={cn(
              "h-7 px-2.5 text-xs gap-1 font-medium transition-all active:scale-95",
              layoutMode === "paged-rtl"
                ? "bg-blue-600/90 text-white shadow-md shadow-blue-600/10"
                : "text-slate-400 hover:text-slate-200"
            )}
            onClick={() => setLayoutMode("paged-rtl")}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">RTL</span>
          </Button>
          <Button
            className={cn(
              "h-7 px-2.5 text-xs gap-1 font-medium transition-all active:scale-95",
              layoutMode === "webtoon"
                ? "bg-blue-600/90 text-white shadow-md shadow-blue-600/10"
                : "text-slate-400 hover:text-slate-200"
            )}
            onClick={() => setLayoutMode("webtoon")}
            variant="ghost"
            size="sm"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Webtoon</span>
          </Button>
        </div>

        {/* Zoom Toggles (Paged Mode only) */}
        {layoutMode !== "webtoon" && (
          <div className="hidden sm:flex items-center rounded-md bg-slate-900/80 p-0.5 border border-slate-800/60">
            <Button
              className="h-7 w-7 text-slate-400 hover:text-slate-100 active:scale-95"
              onClick={zoomOut}
              size="icon"
              variant="ghost"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span
              className="text-[10px] font-mono text-slate-400 px-1.5 cursor-pointer hover:text-slate-200"
              onClick={resetZoom}
            >
              {zoom}%
            </span>
            <Button
              className="h-7 w-7 text-slate-400 hover:text-slate-100 active:scale-95"
              onClick={zoomIn}
              size="icon"
              variant="ghost"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Fit Toggles */}
        {layoutMode !== "webtoon" && (
          <>
            {/* Desktop select */}
            <select
              className="hidden sm:inline-block h-8 rounded-md border border-slate-800/60 bg-slate-900/80 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
              value={fitMode}
              onChange={(e) => {
                setFitMode(e.target.value as "height" | "width" | "original");
                resetZoom();
              }}
            >
              <option value="height">Fit Height</option>
              <option value="width">Fit Width</option>
              <option value="original">Original</option>
            </select>

            {/* Mobile toggler */}
            <Button
              className="inline-flex sm:hidden h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:scale-95"
              onClick={() => {
                setFitMode(fitMode === "height" ? "width" : "height");
                resetZoom();
              }}
              size="icon"
              variant="ghost"
              type="button"
              title={`Switch to Fit ${fitMode === "height" ? "Width" : "Height"}`}
            >
              {fitMode === "height" ? (
                <ArrowLeftRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </>
        )}

        <Button
          aria-label="Toggle Fullscreen"
          className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:scale-95"
          onClick={toggleFullscreen}
          size="icon"
          variant="ghost"
          type="button"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </ReaderHeader>

      {/* Main Viewport Content */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden cursor-pointer"
        onClick={handleViewportClick}
        {...swipeProps}
      >
        {layoutMode === "webtoon" ? (
          /* Webtoon Mode: Continuous Scroll list of lazy loaded images */
          <div
            ref={webtoonScrollRef}
            className="h-full w-full overflow-y-auto flex flex-col items-center gap-6 py-6 px-4 scrollbar-thin"
            onScroll={handleWebtoonScroll}
          >
            {pages.map((page, idx) => (
              <WebtoonPage
                key={`webtoon-${idx}`}
                page={page}
                index={idx}
                resolveUrl={resolvePageUrl}
              />
            ))}
          </div>
        ) : (
          /* Paged Mode: Rendered Page */
          <div className="relative h-full w-full flex items-center justify-center overflow-auto p-4 select-none">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 backdrop-blur-xs">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : null}

            {resolvedUrls[pageIndex] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedUrls[pageIndex]}
                alt={pages[pageIndex]?.name}
                draggable={false}
                className={cn(
                  "pointer-events-none select-none transition-all duration-350 shadow-2xl rounded-sm",
                  fitMode === "height" && "max-h-full max-w-full object-contain",
                  fitMode === "width" && "w-full h-auto object-contain",
                  fitMode === "original" && "max-w-none max-h-none"
                )}
                style={
                  fitMode === "original" || zoom !== 100
                    ? { transform: `scale(${zoom / 100})` }
                    : undefined
                }
              />
            ) : (
              <div className="text-slate-500 text-sm">Failed to load page.</div>
            )}
          </div>
        )}
      </div>

      {/* Footer Toolbar */}
      <ReaderFooter
        isVisible={isUiVisible}
        percentage={progressPercentage}
        onSeek={layoutMode !== "webtoon" ? handleSeek : undefined}
      >
        <label className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-slate-400">
          <span>Page</span>
          <input
            aria-label="Jump to page"
            className="w-10 rounded border border-slate-800 bg-slate-900 px-1 py-0.5 text-center text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
            inputMode="numeric"
            onBlur={() => setPageInput(String(pageIndex + 1))}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitPageInput();
                (e.target as HTMLInputElement).blur();
              }
            }}
            type="text"
            value={pageInput}
          />
          <span>/ {pages.length}</span>
        </label>
      </ReaderFooter>
    </ReaderContainer>
  );
}

type WebtoonPageProps = {
  page: ReaderPage;
  index: number;
  resolveUrl: (idx: number) => Promise<string>;
};

function WebtoonPage({ page, index, resolveUrl }: WebtoonPageProps) {
  const [src, setSrc] = useState<string>("");
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoading(true);
          resolveUrl(index)
            .then((url) => {
              setSrc(url);
              setLoading(false);
            })
            .catch((err) => {
              console.error("Failed to lazy load webtoon image", err);
              setLoading(false);
            });
          observer.disconnect();
        }
      },
      { rootMargin: "650px" } // Pre-load pages 650px ahead of viewport scroll
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, index, resolveUrl]);

  return (
    <div
      ref={setRef}
      data-manga-page={index}
      className="w-full max-w-2xl flex flex-col items-center justify-center min-h-[420px] rounded-md border border-slate-900 bg-slate-950/20 p-2 shadow-inner"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={page.name}
          draggable={false}
          className="w-full h-auto object-contain rounded-xs shadow-md select-none pointer-events-none"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-2 py-20">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          ) : (
            <div className="h-5 w-5 rounded-full border border-dashed border-slate-700" />
          )}
          <span>Page {index + 1}</span>
        </div>
      )}
    </div>
  );
}

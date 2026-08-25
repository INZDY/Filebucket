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
};

export function MangaReader({
  isOpen,
  onClose,
  title,
  pages,
  initialPageIndex = 0,
  onPageChange,
}: MangaReaderProps) {
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [layoutMode, setLayoutMode] = useState<"webtoon" | "paged-ltr" | "paged-rtl">("paged-ltr");
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState<"width" | "height" | "original">("height");
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      prevPagesLengthRef.current = pages.length;
      prevFirstPageNameRef.current = pages[0]?.name;
    }
  }, [pages]);

  const [isLoading, setIsLoading] = useState(false);

  // Sync initialPageIndex
  useEffect(() => {
    setPageIndex(initialPageIndex);
  }, [initialPageIndex]);

  // Notify page changes
  useEffect(() => {
    onPageChange?.(pageIndex);
  }, [pageIndex, onPageChange]);

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

  // Swipe gesture hook
  const swipeProps = useReaderSwipe({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
    isRtl: layoutMode === "paged-rtl",
  });

  // Tap navigation split zone: Left 30% / Right 30% / Center 40%
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select")) {
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
      if (layoutMode === "webtoon") return;

      if (e.key === "ArrowRight") {
        if (layoutMode === "paged-ltr") handleNext();
        else handlePrev();
      } else if (e.key === "ArrowLeft") {
        if (layoutMode === "paged-ltr") handlePrev();
        else handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, layoutMode, handleNext, handlePrev]);

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
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    });
    objectUrlsRef.current = [];
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
                ? "bg-purple-600/90 text-white shadow-md shadow-purple-600/10"
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
                ? "bg-purple-600/90 text-white shadow-md shadow-purple-600/10"
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
                ? "bg-purple-600/90 text-white shadow-md shadow-purple-600/10"
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
              className="hidden sm:inline-block h-8 rounded-md border border-slate-800/60 bg-slate-900/80 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600"
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
          <div className="h-full w-full overflow-y-auto flex flex-col items-center gap-6 py-6 px-4 scrollbar-thin">
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
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
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
        isVisible={isUiVisible && layoutMode !== "webtoon"}
        progressText={`Page ${pageIndex + 1} of ${pages.length} · ${pages[pageIndex]?.name || ""}`}
        percentage={(pageIndex / Math.max(pages.length - 1, 1)) * 100}
      />
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
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          ) : (
            <div className="h-5 w-5 rounded-full border border-dashed border-slate-700" />
          )}
          <span>Page {index + 1}</span>
        </div>
      )}
    </div>
  );
}

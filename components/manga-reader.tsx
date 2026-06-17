"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  BookOpen,
  ArrowUpDown,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
};

export function MangaReader({
  isOpen,
  onClose,
  title,
  pages,
  initialPageIndex = 0,
}: MangaReaderProps) {
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [layoutMode, setLayoutMode] = useState<"webtoon" | "paged-ltr" | "paged-rtl">("paged-ltr");
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState<"width" | "height" | "original">("height");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cache of resolved page URLs (direct URL or blob URL)
  const [resolvedUrls, setResolvedUrls] = useState<Record<number, string>>({});
  const resolvedUrlsRef = useRef<Record<number, string>>({});
  const pagesRef = useRef(pages);
  const prevPagesLengthRef = useRef(pages.length);
  const prevFirstPageNameRef = useRef(pages[0]?.name);

  // Sync pages ref and handle page array changes
  useEffect(() => {
    pagesRef.current = pages;

    const pagesChanged =
      pages.length !== prevPagesLengthRef.current ||
      pages[0]?.name !== prevFirstPageNameRef.current;

    if (pagesChanged) {
      resolvedUrlsRef.current = {};
      setResolvedUrls({});
      prevPagesLengthRef.current = pages.length;
      prevFirstPageNameRef.current = pages[0]?.name;
    }
  }, [pages]);

  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialPageIndex
  useEffect(() => {
    setPageIndex(initialPageIndex);
  }, [initialPageIndex]);

  // Handle exiting fullscreen when closed
  useEffect(() => {
    if (!isOpen && isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, [isOpen, isFullscreen]);

  // Load a single page URL (if not already cached)
  const resolvePageUrl = useCallback(
    async (idx: number): Promise<string> => {
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
        setResolvedUrls((prev) => ({ ...prev, [idx]: url }));
        return url;
      }

      return "";
    },
    []
  );

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

  // Navigation handlers
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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Zoom handlers
  const zoomIn = () => setZoom((z) => Math.min(z + 10, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 50));
  const resetZoom = () => setZoom(100);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#0b0c10] text-slate-100 select-none animate-fade-in"
    >
      {/* Header Toolbar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800/80 bg-[#111318]/95 px-4 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            aria-label="Exit manga reader"
            className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:scale-95 transition-transform"
            onClick={onClose}
            size="icon"
            variant="ghost"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-200" title={title}>
              {title}
            </h2>
            {layoutMode !== "webtoon" && (
              <p className="text-[10px] text-slate-400">
                Page {pageIndex + 1} of {pages.length} · {pages[pageIndex]?.name}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
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
              <BookOpen className="h-3.5 w-3.5" />
              LTR
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
              <BookOpen className="h-3.5 w-3.5 scale-x-[-1]" />
              RTL
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
              Webtoon
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
            <select
              className="h-8 rounded-md border border-slate-800/60 bg-slate-900/80 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600"
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
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
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
          /* Paged Mode: Left/Right click zone navigation */
          <div className="relative h-full w-full flex items-center justify-center overflow-auto p-4 select-none">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 backdrop-blur-xs">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : null}

            {/* Click zones for screen taps */}
            <div className="absolute inset-0 flex z-0">
              <div
                className="w-1/3 h-full cursor-w-resize"
                onClick={layoutMode === "paged-ltr" ? handlePrev : handleNext}
              />
              <div className="w-1/3 h-full cursor-zoom-in" onClick={resetZoom} />
              <div
                className="w-1/3 h-full cursor-e-resize"
                onClick={layoutMode === "paged-ltr" ? handleNext : handlePrev}
              />
            </div>

            {/* Rendered Image Page */}
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

            {/* Floating Navigation Chevrons */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
              <Button
                className={cn(
                  "h-11 w-11 rounded-full border border-slate-800 bg-[#171a20]/75 text-slate-300 hover:bg-[#1f242c]/90 hover:text-white shadow-xl active:scale-90 transition-transform",
                  (layoutMode === "paged-ltr" ? pageIndex === 0 : pageIndex === pages.length - 1) &&
                    "opacity-40 pointer-events-none"
                )}
                onClick={layoutMode === "paged-ltr" ? handlePrev : handleNext}
                size="icon"
                variant="outline"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </div>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
              <Button
                className={cn(
                  "h-11 w-11 rounded-full border border-slate-800 bg-[#171a20]/75 text-slate-300 hover:bg-[#1f242c]/90 hover:text-white shadow-xl active:scale-90 transition-transform",
                  (layoutMode === "paged-ltr" ? pageIndex === pages.length - 1 : pageIndex === 0) &&
                    "opacity-40 pointer-events-none"
                )}
                onClick={layoutMode === "paged-ltr" ? handleNext : handlePrev}
                size="icon"
                variant="outline"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
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

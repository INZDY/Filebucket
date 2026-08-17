/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  BookOpen,
  Loader2,
  Scroll,
  Columns,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ePub from "epubjs";

type FontSize = "sm" | "md" | "lg" | "xl";
type FontFamily = "sans" | "serif" | "mono";

// Map settings to fonts & size
const fontSizes: Record<FontSize, string> = {
  sm: "text-sm", // 14px
  md: "text-base", // 16px
  lg: "text-lg", // 18px
  xl: "text-xl", // 20px
};

const epubFontSizes: Record<FontSize, string> = {
  sm: "80%",
  md: "100%",
  lg: "120%",
  xl: "145%",
};

const fontFamilies: Record<FontFamily, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

const epubFontFamilies: Record<FontFamily, string> = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
};

export type BookReaderProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  contentType: string;
  mediaId: string;
};

type ThemeName = "light" | "sepia" | "dark";
type LayoutMode = "paged" | "scroll";

export function BookReader({
  isOpen,
  onClose,
  title,
  url,
  contentType,
  mediaId,
}: BookReaderProps) {
  // Mounting & Portal State
  const [mounted, setMounted] = useState(false);

  // Reader Settings
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("paged");
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");

  // EPUB States
  const [rendition, setRendition] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [epubLoading, setEpubLoading] = useState(false);
  const [currentCfi, setCurrentCfi] = useState<string>("");

  // TXT States
  const [txtContent, setTxtContent] = useState<string>("");
  const [txtLoading, setTxtLoading] = useState(false);
  const [txtPageIndex, setTxtPageIndex] = useState<number>(0);

  // Common Progress States
  const [percentage, setPercentage] = useState<number>(0);
  const [progressLoaded, setProgressLoaded] = useState(false);

  // DOM Refs
  const viewerRef = useRef<HTMLDivElement>(null);
  const txtScrollContainerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const lastSavedRef = useRef<{ position: string; percentage: number } | null>(null);

  // SSR-safe mounting check
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch /api/media/progress on mount
  useEffect(() => {
    if (!isOpen || !mediaId) return;

    let active = true;
    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/media/progress?mediaAssetId=${mediaId}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data) {
            if (data.position) {
              if (contentType === "text/plain") {
                if (layoutMode === "paged") {
                  setTxtPageIndex(Number(data.position) || 0);
                }
              } else {
                setCurrentCfi(data.position);
              }
            }
            if (data.percentage !== undefined) {
              setPercentage(data.percentage);
            }
            if (data.settings) {
              if (data.settings.theme) setTheme(data.settings.theme);
              if (data.settings.layoutMode) setLayoutMode(data.settings.layoutMode);
              if (data.settings.fontSize) setFontSize(data.settings.fontSize);
              if (data.settings.fontFamily) setFontFamily(data.settings.fontFamily);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load progress:", err);
      } finally {
        if (active) setProgressLoaded(true);
      }
    };

    fetchProgress();
    return () => {
      active = false;
    };
  }, [isOpen, mediaId, contentType, layoutMode]);

  // Push progress save to DB
  const saveProgress = useCallback(
    async (position: string, pct: number) => {
      if (!mediaId || !position) return;
      if (
        lastSavedRef.current &&
        lastSavedRef.current.position === position &&
        lastSavedRef.current.percentage === pct
      ) {
        return; // Avoid redundant saves
      }

      lastSavedRef.current = { position, percentage: pct };
      try {
        await fetch("/api/media/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mediaAssetId: mediaId,
            position,
            percentage: parseFloat(pct.toFixed(1)),
            settings: { theme, layoutMode, fontSize, fontFamily },
          }),
        });
      } catch (err) {
        console.error("Failed to save progress:", err);
      }
    },
    [mediaId, theme, layoutMode, fontSize, fontFamily]
  );

  // Debounced save reference
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveProgressDebounced = useCallback(
    (position: string, pct: number) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        saveProgress(position, pct);
      }, 1500);
    },
    [saveProgress]
  );

  // Immediate save on close
  const handleClose = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    const currentPosition =
      contentType === "text/plain"
        ? layoutMode === "paged"
          ? String(txtPageIndex)
          : txtScrollContainerRef.current
          ? String(txtScrollContainerRef.current.scrollTop)
          : "0"
        : currentCfi;

    if (currentPosition) {
      saveProgress(currentPosition, percentage);
    }
    onClose();
  }, [contentType, layoutMode, txtPageIndex, currentCfi, percentage, saveProgress, onClose]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  // Fetch TXT contents if plain text
  useEffect(() => {
    if (contentType !== "text/plain" || !url || !isOpen) return;

    const loadTxt = async () => {
      setTxtLoading(true);
      try {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          setTxtContent(text);
        }
      } catch (err) {
        console.error("Failed to load text file:", err);
      } finally {
        setTxtLoading(false);
      }
    };

    loadTxt();
  }, [contentType, url, isOpen]);

  // Paged TXT calculation
  const PAGE_SIZE = 1500; // character count per page
  const txtPages = txtContent
    ? Array.from({ length: Math.ceil(txtContent.length / PAGE_SIZE) }, (_, index) =>
        txtContent.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE)
      )
    : [];

  // Handle TXT Scroll progress tracking
  const handleTxtScroll = useCallback(() => {
    if (layoutMode !== "scroll" || !txtScrollContainerRef.current) return;
    const el = txtScrollContainerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    const pct = (el.scrollTop / maxScroll) * 100;
    setPercentage(pct);
    saveProgressDebounced(String(el.scrollTop), pct);
  }, [layoutMode, saveProgressDebounced]);

  // Restore TXT scroll position once content is loaded
  useEffect(() => {
    if (
      contentType === "text/plain" &&
      layoutMode === "scroll" &&
      txtContent &&
      progressLoaded
    ) {
      // position holds the scrollTop value
      const timer = setTimeout(() => {
        if (txtScrollContainerRef.current && lastSavedRef.current === null) {
          const savedScrollTop = parseFloat(currentCfi) || 0;
          txtScrollContainerRef.current.scrollTop = savedScrollTop;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [contentType, layoutMode, txtContent, progressLoaded, currentCfi]);

  // Sync paged txt changes to server
  useEffect(() => {
    if (contentType === "text/plain" && layoutMode === "paged" && txtPages.length > 0) {
      const pct = txtPages.length > 1 ? (txtPageIndex / (txtPages.length - 1)) * 100 : 100;
      setPercentage(pct);
      saveProgressDebounced(String(txtPageIndex), pct);
    }
  }, [txtPageIndex, layoutMode, txtPages.length, contentType, saveProgressDebounced]);

  // EPUB initialization
  useEffect(() => {
    if (contentType === "text/plain" || !url || !isOpen || !viewerRef.current) return;

    setEpubLoading(true);

    let bookInstance: any = null;
    let renditionInstance: any = null;
    let active = true;

    const initEpub = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch EPUB: ${res.statusText}`);
        const buffer = await res.arrayBuffer();

        if (!active) return;

        bookInstance = ePub(buffer);

        renditionInstance = bookInstance.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: layoutMode === "scroll" ? "scrolled" : "paginated",
        });
        setRendition(renditionInstance);
        renditionRef.current = renditionInstance;

        // Load Table of Contents
        bookInstance.loaded.navigation.then((nav: any) => {
          if (active) setToc(nav.toc || []);
        });

        // Handle relocated event to track progress
        renditionInstance.on("relocated", (location: any) => {
          const cfi = location.start.cfi;
          setCurrentCfi(cfi);

          let pct = 0;
          if (bookInstance.locations && bookInstance.locations.length > 0) {
            pct = bookInstance.locations.percentageFromCfi(cfi) * 100;
            setPercentage(pct);
          }
          saveProgressDebounced(cfi, pct);
        });

        // Display book at initial CFI or start
        await bookInstance.ready;
        if (!active) return;

        const targetCfi = currentCfi || undefined;
        await renditionInstance.display(targetCfi);

        if (active) setEpubLoading(false);

        // Generate locations for percentage calculation
        await bookInstance.locations.generate(1024);
        if (active && renditionInstance.location?.start?.cfi) {
          const pct = bookInstance.locations.percentageFromCfi(renditionInstance.location.start.cfi) * 100;
          setPercentage(pct);
        }
      } catch (err) {
        console.error("Error loading EPUB book:", err);
        if (active) setEpubLoading(false);
      }
    };

    initEpub();

    return () => {
      active = false;
      try {
        if (renditionInstance) renditionInstance.destroy();
        if (bookInstance) bookInstance.destroy();
      } catch (e) {
        console.error(e);
      }
      setRendition(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, contentType, isOpen, layoutMode]);

  // Apply layout flow dynamically for EPUB
  useEffect(() => {
    if (!rendition) return;
    rendition.flow(layoutMode === "scroll" ? "scrolled" : "paginated");
  }, [layoutMode, rendition]);



  // Sync style changes inside the EPUB frame
  useEffect(() => {
    if (!rendition) return;

    // Register themes in epubjs iframe
    rendition.themes.register("light", {
      body: {
        background: "#ffffff !important",
        color: "#0f172a !important",
      },
    });
    rendition.themes.register("sepia", {
      body: {
        background: "#f4eccf !important",
        color: "#4a3b32 !important",
      },
    });
    rendition.themes.register("dark", {
      body: {
        background: "#0d0f14 !important",
        color: "#f1f5f9 !important",
      },
    });

    rendition.themes.select(theme);
    rendition.themes.fontSize(epubFontSizes[fontSize]);
    // Try to apply font-family if custom override is possible
    rendition.themes.register("font-override", {
      "*": {
        "font-family": `${epubFontFamilies[fontFamily]} !important`,
      },
    });
    rendition.themes.select("font-override");
  }, [rendition, theme, fontSize, fontFamily]);

  // EPUB Page Turning handlers
  const handleEpubNext = useCallback(() => {
    if (rendition) rendition.next();
  }, [rendition]);

  const handleEpubPrev = useCallback(() => {
    if (rendition) rendition.prev();
  }, [rendition]);

  // Click handler for TOC navigation
  const handleTocClick = useCallback(
    (href: string) => {
      if (rendition) {
        rendition.display(href);
        setIsTocOpen(false);
      }
    },
    [rendition]
  );

  // Early returns
  if (!isOpen || !mounted) return null;

  // Formatting variables for UI
  const themeClasses: Record<ThemeName, string> = {
    dark: "bg-[#0d0f14]/95 text-slate-100 dark-theme",
    light: "bg-white text-slate-900 light-theme",
    sepia: "bg-[#f4eccf] text-[#4a3b32] sepia-theme",
  };

  const controlClasses: Record<ThemeName, string> = {
    dark: "bg-slate-900/90 border-slate-800 text-slate-100",
    light: "bg-slate-50 border-slate-200 text-slate-900",
    sepia: "bg-[#eae1c0] border-[#d8cc9d] text-[#4a3b32]",
  };

  const activeBtnClasses: Record<ThemeName, string> = {
    dark: "bg-blue-600 text-white hover:bg-blue-500",
    light: "bg-blue-600 text-white hover:bg-blue-500",
    sepia: "bg-[#7c695b] text-white hover:bg-[#6c594c]",
  };

  // Plain Text Content Renderer
  const renderTxtView = () => {
    if (txtLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-xs text-slate-400">Loading document...</p>
        </div>
      );
    }

    if (layoutMode === "paged") {
      const pageText = txtPages[txtPageIndex] || "";
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
          <div className="flex-1 flex items-center justify-center w-full max-w-3xl overflow-auto py-8">
            <div
              className={cn(
                "whitespace-pre-wrap leading-relaxed max-w-full font-normal select-text txt-content-viewer px-6",
                fontSizes[fontSize],
                fontFamilies[fontFamily]
              )}
            >
              {pageText}
            </div>
          </div>

          {/* Navigation overlay buttons */}
          <div className="absolute inset-y-0 left-2 flex items-center">
            <Button
              variant="outline"
              size="icon"
              className={cn("rounded-full opacity-60 hover:opacity-100", controlClasses[theme])}
              onClick={() => setTxtPageIndex((p) => Math.max(0, p - 1))}
              disabled={txtPageIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-2 flex items-center">
            <Button
              variant="outline"
              size="icon"
              className={cn("rounded-full opacity-60 hover:opacity-100", controlClasses[theme])}
              onClick={() => setTxtPageIndex((p) => Math.min(txtPages.length - 1, p + 1))}
              disabled={txtPageIndex >= txtPages.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      );
    }

    // Scroll mode for TXT
    return (
      <div
        ref={txtScrollContainerRef}
        onScroll={handleTxtScroll}
        className="flex-1 overflow-y-auto px-6 py-12 select-text"
      >
        <div
          className={cn(
            "max-w-2xl mx-auto whitespace-pre-wrap leading-relaxed txt-content-viewer",
            fontSizes[fontSize],
            fontFamilies[fontFamily]
          )}
        >
          {txtContent}
        </div>
      </div>
    );
  };

  // Rendering inside portal on document.body
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col select-none book-reader-overlay transition-colors duration-200",
        themeClasses[theme]
      )}
    >
      {/* Top Header Controls Panel */}
      <header
        className={cn(
          "flex flex-wrap items-center justify-between px-4 py-2.5 border-b shadow-md z-50",
          controlClasses[theme]
        )}
      >
        <div className="flex items-center gap-3 min-w-0 max-w-[40%]">
          <BookOpen className="h-5 w-5 flex-shrink-0 text-blue-500" />
          <h2 className="text-sm font-semibold truncate" title={title}>
            {title}
          </h2>
        </div>

        {/* Reader Customization Options */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* TOC Toggle (EPUB only) */}
          {contentType !== "text/plain" && (
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 px-2.5 text-xs gap-1", controlClasses[theme])}
              onClick={() => setIsTocOpen(!isTocOpen)}
            >
              <Menu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">TOC</span>
            </Button>
          )}

          {/* Theme Selector */}
          <div className="flex rounded-md border p-0.5 gap-0.5 border-slate-700 bg-black/10">
            <button
              data-testid="theme-toggle-light"
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded",
                theme === "light"
                  ? activeBtnClasses[theme]
                  : "text-slate-400 hover:text-slate-200"
              )}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              data-testid="theme-toggle-sepia"
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded",
                theme === "sepia"
                  ? activeBtnClasses[theme]
                  : "text-[#7c695b] hover:text-[#5c4a3b]"
              )}
              onClick={() => setTheme("sepia")}
            >
              Sepia
            </button>
            <button
              data-testid="theme-toggle-dark"
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded",
                theme === "dark"
                  ? activeBtnClasses[theme]
                  : "text-slate-400 hover:text-slate-200"
              )}
              onClick={() => setTheme("dark")}
            >
              Glass Dark
            </button>
          </div>

          {/* Layout Mode Toggler */}
          <Button
            variant="outline"
            size="icon"
            data-testid="layout-toggle"
            title={layoutMode === "paged" ? "Switch to Scroll" : "Switch to Paged"}
            className={cn("h-8 w-8", controlClasses[theme])}
            onClick={() => setLayoutMode(layoutMode === "paged" ? "scroll" : "paged")}
          >
            {layoutMode === "paged" ? (
              <Columns className="h-3.5 w-3.5" />
            ) : (
              <Scroll className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Font Family Selection */}
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as FontFamily)}
            className={cn("h-8 rounded-md border text-xs px-2 bg-transparent outline-none", controlClasses[theme])}
          >
            <option value="sans">Sans Serif</option>
            <option value="serif">Serif</option>
            <option value="mono">Monospace</option>
          </select>

          {/* Font Size Selection */}
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value as FontSize)}
            className={cn("h-8 rounded-md border text-xs px-2 bg-transparent outline-none", controlClasses[theme])}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">X-Large</option>
          </select>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Close Reader */}
          <Button
            variant="ghost"
            size="icon"
            data-testid="close-reader"
            className="h-8 w-8 hover:bg-rose-500/20 hover:text-rose-400"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Canvas Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Table of Contents Drawer (EPUB) */}
        {isTocOpen && contentType !== "text/plain" && (
          <aside
            className={cn(
              "absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r shadow-2xl z-40 flex flex-col transition-all duration-300",
              controlClasses[theme]
            )}
          >
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Table of Contents
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsTocOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {toc.length === 0 ? (
                <p className="text-xs text-center text-slate-500 mt-4">No chapters found</p>
              ) : (
                <ul className="space-y-0.5">
                  {toc.map((item, idx) => (
                    <li key={idx}>
                      <button
                        className="w-full text-left text-xs px-3 py-2 rounded-md hover:bg-blue-600/10 hover:text-blue-500 transition-colors truncate"
                        onClick={() => handleTocClick(item.href)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}

        {/* EPUB Document Canvas */}
        {contentType !== "text/plain" ? (
          <div className="flex-1 flex flex-col relative overflow-hidden">
            {epubLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-inherit bg-opacity-70">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                <p className="text-xs text-slate-400 animate-pulse">Loading EPUB document...</p>
              </div>
            )}
            {/* epubjs render element */}
            <div ref={viewerRef} className="flex-1 w-full h-full p-2 relative" />

            {/* Paged Layout Overlay controls */}
            {layoutMode === "paged" && !epubLoading && (
              <>
                <div className="absolute inset-y-0 left-2 flex items-center z-20">
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 shadow-lg",
                      controlClasses[theme]
                    )}
                    onClick={handleEpubPrev}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </div>
                <div className="absolute inset-y-0 right-2 flex items-center z-20">
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 shadow-lg",
                      controlClasses[theme]
                    )}
                    onClick={handleEpubNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          renderTxtView()
        )}
      </main>

      {/* Footnote Metadata Status Bar */}
      <footer
        className={cn(
          "flex justify-between items-center px-4 py-1.5 border-t text-[10px] font-mono",
          controlClasses[theme]
        )}
      >
        <span className="truncate max-w-[60%]">
          {contentType === "text/plain" && layoutMode === "paged"
            ? `Page ${txtPageIndex + 1} of ${txtPages.length}`
            : `Reading Progress`}
        </span>
        <span>{percentage.toFixed(0)}% Read</span>
      </footer>
    </div>,
    document.body
  );
}

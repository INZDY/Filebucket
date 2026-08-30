/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Menu,
  Loader2,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ePub from "epubjs";
import {
  ReaderContainer,
  ReaderHeader,
  ReaderFooter,
  useReaderOverlay,
  useReaderSwipe,
} from "./reader-shared";

type FontSize = "sm" | "md" | "lg" | "xl";
type FontFamily = "sans" | "serif" | "mono";

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
  // Reader Settings
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("paged");
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
  const [fontWeight, setFontWeight] = useState<string>("normal");
  const [lineHeight, setLineHeight] = useState<string>("1.5");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  // EPUB States
  const [rendition, setRendition] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [epubLoading, setEpubLoading] = useState(false);
  const [currentCfi, setCurrentCfi] = useState<string>("");
  const [epubCurrentPage, setEpubCurrentPage] = useState<number>(0);
  const [epubTotalPages, setEpubTotalPages] = useState<number>(0);

  // TXT States
  const [txtContent, setTxtContent] = useState<string>("");
  const [txtLoading, setTxtLoading] = useState(false);
  const [txtPageIndex, setTxtPageIndex] = useState<number>(0);

  // Common Progress States
  const [percentage, setPercentage] = useState<number>(0);
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Hooks for overlay
  const { isUiVisible, toggleUiVisibility } = useReaderOverlay(true);

  // DOM Refs
  const [viewerElement, setViewerElement] = useState<HTMLDivElement | null>(null);
  const txtScrollContainerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const lastSavedRef = useRef<{ position: string; percentage: number } | null>(null);

  // Click outside to close settings dropdown
  useEffect(() => {
    if (!isSettingsOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Fetch progress on mount
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
                setTxtPageIndex(Number(data.position) || 0);
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
              if (data.settings.fontWeight) setFontWeight(data.settings.fontWeight);
              if (data.settings.lineHeight) setLineHeight(data.settings.lineHeight);
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
  }, [isOpen, mediaId, contentType]);

  // Push progress save to DB
  const saveProgress = useCallback(
    async (position: string, pct: number) => {
      if (!mediaId || !position) return;
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mediaAssetId: mediaId,
            position,
            percentage: parseFloat(pct.toFixed(1)),
            settings: { theme, layoutMode, fontSize, fontFamily, fontWeight, lineHeight },
          }),
        });
      } catch (err) {
        console.error("Failed to save progress:", err);
      }
    },
    [mediaId, theme, layoutMode, fontSize, fontFamily, fontWeight, lineHeight]
  );

  // Debounced save
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
    if (!progressLoaded) {
      onClose();
      return;
    }
    const currentPosition =
      contentType === "text/plain"
        ? layoutMode === "paged"
          ? String(txtPageIndex)
          : txtScrollContainerRef.current
          ? String(txtScrollContainerRef.current.scrollTop)
          : "0"
        : currentCfi;

    if (currentCfi || contentType === "text/plain") {
      saveProgress(currentPosition, percentage);
    }
    onClose();
  }, [contentType, layoutMode, txtPageIndex, currentCfi, percentage, saveProgress, onClose, progressLoaded]);

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
  const PAGE_SIZE = 1500;
  const txtPages = txtContent
    ? Array.from({ length: Math.ceil(txtContent.length / PAGE_SIZE) }, (_, index) =>
        txtContent.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE)
      )
    : [];

  // Handle TXT Scroll progress tracking
  const handleTxtScroll = useCallback(() => {
    if (layoutMode !== "scroll" || !txtScrollContainerRef.current || !progressLoaded) return;
    const el = txtScrollContainerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    const pct = (el.scrollTop / maxScroll) * 100;
    setPercentage(pct);
    saveProgressDebounced(String(el.scrollTop), pct);
  }, [layoutMode, saveProgressDebounced, progressLoaded]);

  // Restore TXT scroll position
  useEffect(() => {
    if (
      contentType === "text/plain" &&
      layoutMode === "scroll" &&
      txtContent &&
      progressLoaded
    ) {
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
    if (contentType === "text/plain" && layoutMode === "paged" && txtPages.length > 0 && progressLoaded) {
      const pct = txtPages.length > 1 ? (txtPageIndex / (txtPages.length - 1)) * 100 : 100;
      setPercentage(pct);
      saveProgressDebounced(String(txtPageIndex), pct);
    }
  }, [txtPageIndex, layoutMode, txtPages.length, contentType, saveProgressDebounced, progressLoaded]);

  // Page turning handlers
  const handleEpubNext = useCallback(() => {
    if (rendition) rendition.next();
  }, [rendition]);

  const handleEpubPrev = useCallback(() => {
    if (rendition) rendition.prev();
  }, [rendition]);

  // EPUB initialization
  useEffect(() => {
    if (contentType === "text/plain" || !url || !isOpen || !viewerElement || !progressLoaded) return;

    viewerElement.innerHTML = "";
    setEpubLoading(true);

    let bookInstance: any = null;
    let renditionInstance: any = null;
    let active = true;

    const initEpub = async () => {
      try {
        const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}_cb=${Date.now()}`;
        const res = await fetch(cacheBustedUrl);
        if (!res.ok) throw new Error(`Failed to fetch EPUB: ${res.statusText}`);
        const buffer = await res.arrayBuffer();

        if (!active) return;

        const blob = new Blob([buffer], { type: "application/epub+zip" });
        const epubCreator = typeof ePub === "function" ? ePub : (ePub as any).default;
        bookInstance = epubCreator(blob);

        renditionInstance = bookInstance.renderTo(viewerElement, {
          width: "100%",
          height: "100%",
          flow: layoutMode === "scroll" ? "scrolled" : "paginated",
        });
        setRendition(renditionInstance);
        renditionRef.current = renditionInstance;

        bookInstance.on("openFailed", (err: any) => {
          console.error("ePub openFailed:", err);
        });

        renditionInstance.on("displayerror", (err: any) => {
          console.error("Rendition displayerror:", err);
        });

        renditionInstance.on("keydown", (event: any) => {
          if (event.key === "ArrowLeft") {
            renditionInstance.prev();
          } else if (event.key === "ArrowRight") {
            renditionInstance.next();
          }
        });

        bookInstance.loaded.navigation.then((nav: any) => {
          if (active) setToc(nav.toc || []);
        });

        renditionInstance.on("relocated", (location: any) => {
          const cfi = location.start.cfi;
          setCurrentCfi(cfi);

          let pct = 0;
          if (bookInstance.locations && bookInstance.locations.length() > 0) {
            pct = bookInstance.locations.percentageFromCfi(cfi) * 100;
            setPercentage(pct);
            const currPage = bookInstance.locations.locationFromCfi(cfi);
            if (currPage !== -1) {
              setEpubCurrentPage(currPage + 1);
            }
          }
          saveProgressDebounced(cfi, pct);
        });

        await bookInstance.ready;
        if (!active) return;

        const targetCfi = currentCfi || undefined;
        try {
          await renditionInstance.display(targetCfi);
        } catch (e) {
          console.warn("Failed to display CFI position, falling back to start page", e);
          await renditionInstance.display();
        }

        if (active) setEpubLoading(false);

        await bookInstance.locations.generate(1024);
        if (active) {
          const totalLocs = bookInstance.locations.length();
          setEpubTotalPages(totalLocs);
          if (renditionInstance.location?.start?.cfi) {
            const currentLocCfi = renditionInstance.location.start.cfi;
            const pct = bookInstance.locations.percentageFromCfi(currentLocCfi) * 100;
            setPercentage(pct);
            const currPage = bookInstance.locations.locationFromCfi(currentLocCfi);
            if (currPage !== -1) {
              setEpubCurrentPage(currPage + 1);
            }
          }
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
        if (renditionInstance) {
          if (typeof renditionInstance.destroy === "function") renditionInstance.destroy();
        }
        if (bookInstance) {
          if (typeof bookInstance.destroy === "function") bookInstance.destroy();
        }
      } catch (e) {
        console.error(e);
      }
      setRendition(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, contentType, isOpen, layoutMode, viewerElement, progressLoaded]);

  // Apply layout flow dynamically for EPUB
  useEffect(() => {
    if (!rendition) return;
    rendition.flow(layoutMode === "scroll" ? "scrolled" : "paginated");
  }, [layoutMode, rendition]);

  // Sync style changes inside the EPUB frame
  useEffect(() => {
    if (!rendition) return;

    const styleOverride = {
      "font-family": `${epubFontFamilies[fontFamily]} !important`,
      "font-weight": `${fontWeight} !important`,
      "line-height": `${lineHeight} !important`,
    };

    rendition.themes.register("light", {
      "body.light": {
        background: "#ffffff !important",
        color: "#0f172a !important",
        ...styleOverride,
      },
      ".light p, .light span, .light div, .light h1, .light h2, .light h3, .light h4, .light h5, .light h6, .light li, .light a": {
        color: "#0f172a !important",
        ...styleOverride,
      },
    });

    rendition.themes.register("sepia", {
      "body.sepia": {
        background: "#f4eccf !important",
        color: "#4a3b32 !important",
        ...styleOverride,
      },
      ".sepia p, .sepia span, .sepia div, .sepia h1, .sepia h2, .sepia h3, .sepia h4, .sepia h5, .sepia h6, .sepia li, .sepia a": {
        color: "#4a3b32 !important",
        ...styleOverride,
      },
    });

    rendition.themes.register("dark", {
      "body.dark": {
        background: "#0d0f14 !important",
        color: "#f1f5f9 !important",
        ...styleOverride,
      },
      ".dark p, .dark span, .dark div, .dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6, .dark li, .dark a": {
        color: "#f1f5f9 !important",
        ...styleOverride,
      },
    });

    rendition.themes.select(theme);
    rendition.themes.fontSize(epubFontSizes[fontSize]);
  }, [rendition, theme, fontSize, fontFamily, fontWeight, lineHeight]);

  // Listen to keyboard navigation on parent window
  useEffect(() => {
    if (!isOpen || contentType === "text/plain") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        handleEpubPrev();
      } else if (event.key === "ArrowRight") {
        handleEpubNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, contentType, handleEpubPrev, handleEpubNext]);

  const handleTocClick = useCallback(
    (href: string) => {
      if (rendition) {
        let displayTarget = href;

        // Resolve TOC relative path to spine items to avoid "No Section Found" error
        const book = rendition.book;
        if (book && book.spine) {
          // Direct check first
          let section = book.spine.get(href);
          if (!section) {
            // Strip fragment if any
            const [pathPart, fragment] = href.split("#");
            section = book.spine.get(pathPart);

            if (!section) {
              // Try matching by checking suffix & ignoring extensions
              const clean = (p: string) => {
                const normalized = p.replace(/^\.\//, "");
                const lastSlash = normalized.lastIndexOf("/");
                const filename = lastSlash !== -1 ? normalized.substring(lastSlash + 1) : normalized;
                const lastDot = filename.lastIndexOf(".");
                const nameNoExt = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
                const dir = lastSlash !== -1 ? normalized.substring(0, lastSlash) : "";
                return dir ? `${dir}/${nameNoExt}` : nameNoExt;
              };

              const targetClean = clean(pathPart);
              const found = book.spine.spineItems?.find((item: any) => {
                if (!item.href) return false;
                const itemClean = clean(item.href);
                return (
                  itemClean === targetClean ||
                  itemClean.endsWith("/" + targetClean) ||
                  targetClean.endsWith("/" + itemClean)
                );
              });

              if (found) {
                section = found;
              }
            }

            if (section && section.href) {
              displayTarget = fragment ? `${section.href}#${fragment}` : section.href;
            }
          }
        }

        rendition.display(displayTarget);
        setIsTocOpen(false);
      }
    },
    [rendition]
  );

  // Swipe gesture hooks
  const handleSwipeLeft = useCallback(() => {
    if (contentType === "text/plain") {
      if (layoutMode === "paged") {
        setTxtPageIndex((p) => Math.min(txtPages.length - 1, p + 1));
      }
    } else {
      handleEpubNext();
    }
  }, [contentType, layoutMode, txtPages.length, handleEpubNext]);

  const handleSwipeRight = useCallback(() => {
    if (contentType === "text/plain") {
      if (layoutMode === "paged") {
        setTxtPageIndex((p) => Math.max(0, p - 1));
      }
    } else {
      handleEpubPrev();
    }
  }, [contentType, layoutMode, handleEpubPrev]);

  const swipeProps = useReaderSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    isRtl: false,
  });

  if (!isOpen) return null;

  // Theme page backgrounds
  const themePageClasses: Record<ThemeName, string> = {
    dark: "bg-[#0d0f14] text-[#f1f5f9]",
    light: "bg-white text-[#0f172a]",
    sepia: "bg-[#f4eccf] text-[#4a3b32]",
  };

  const activeBtnClass = "bg-blue-600 text-white hover:bg-blue-500";
  const inactiveBtnClass = "text-slate-400 hover:text-slate-200";

  // Plain Text Content Renderer
  const renderTxtView = () => {
    if (txtLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
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
                "whitespace-pre-wrap max-w-full select-text txt-content-viewer px-6",
                fontSizes[fontSize],
                fontFamilies[fontFamily]
              )}
              style={{ fontWeight, lineHeight }}
            >
              {pageText}
            </div>
          </div>

          {/* Transparent click/swipe overlays */}
          <div className="absolute inset-0 z-20 flex pointer-events-none" {...swipeProps}>
            <div
              className="w-[30%] h-full cursor-w-resize pointer-events-auto"
              onClick={() => setTxtPageIndex((p) => Math.max(0, p - 1))}
            />
            <div
              className="w-[40%] h-full cursor-pointer pointer-events-auto"
              onClick={toggleUiVisibility}
            />
            <div
              className="w-[30%] h-full cursor-e-resize pointer-events-auto"
              onClick={() => setTxtPageIndex((p) => Math.min(txtPages.length - 1, p + 1))}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        ref={txtScrollContainerRef}
        onScroll={handleTxtScroll}
        onClick={toggleUiVisibility}
        className="flex-1 overflow-y-auto px-6 py-12 select-text cursor-pointer"
      >
        <div
          className={cn(
            "max-w-2xl mx-auto whitespace-pre-wrap txt-content-viewer",
            fontSizes[fontSize],
            fontFamilies[fontFamily]
          )}
          style={{ fontWeight, lineHeight }}
        >
          {txtContent}
        </div>
      </div>
    );
  };

  const getPageLabel = () => {
    if (contentType === "text/plain") {
      if (layoutMode === "paged") {
        return `${txtPageIndex + 1} of ${txtPages.length}`;
      }
      return "Reading Progress";
    } else {
      if (epubTotalPages > 0) {
        return `${epubCurrentPage} of ${epubTotalPages}`;
      }
      return epubLoading || epubTotalPages === 0 ? "Calculating..." : "Reading Progress";
    }
  };
  const pageLabel = getPageLabel();

  return (
    <ReaderContainer isOpen={isOpen} onClose={handleClose} className="book-reader-overlay">
      {/* Top Header Controls Panel - Always Dark */}
      <ReaderHeader title={title} onClose={handleClose} isVisible={isUiVisible}>
        {/* TOC Toggle (EPUB only) */}
        {contentType !== "text/plain" && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1 bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-850"
            onClick={() => setIsTocOpen(!isTocOpen)}
          >
            <Menu className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">TOC</span>
          </Button>
        )}

        {/* Settings Dropdown Button */}
        <Button
          ref={settingsBtnRef}
          variant="outline"
          size="sm"
          data-testid="settings-toggle"
          className="h-8 px-2.5 text-xs gap-1 bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-850"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </Button>

        {/* Dropdown panel - Always Dark */}
        {isSettingsOpen && (
          <div
            ref={settingsRef}
            data-testid="settings-dropdown"
            className="fixed right-2 left-2 top-16 md:absolute md:right-0 md:left-auto md:top-10 w-auto md:w-72 p-4 rounded-lg border shadow-xl z-[60] space-y-3.5 bg-slate-900 border-slate-800 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2.5">
              {/* Theme Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Theme</span>
                <div className="flex rounded-md border p-0.5 gap-0.5 border-slate-700 bg-black/10">
                  <button
                    data-testid="theme-toggle-light"
                    className={cn(
                      "flex-1 py-1 text-[10px] font-medium rounded text-center",
                      theme === "light" ? activeBtnClass : inactiveBtnClass
                    )}
                    onClick={() => setTheme("light")}
                  >
                    Light
                  </button>
                  <button
                    data-testid="theme-toggle-sepia"
                    className={cn(
                      "flex-1 py-1 text-[10px] font-medium rounded text-center",
                      theme === "sepia" ? activeBtnClass : inactiveBtnClass
                    )}
                    onClick={() => setTheme("sepia")}
                  >
                    Sepia
                  </button>
                  <button
                    data-testid="theme-toggle-dark"
                    className={cn(
                      "flex-1 py-1 text-[10px] font-medium rounded text-center",
                      theme === "dark" ? activeBtnClass : inactiveBtnClass
                    )}
                    onClick={() => setTheme("dark")}
                  >
                    Glass Dark
                  </button>
                </div>
              </div>

              {/* Layout Mode */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Layout</span>
                <div className="flex rounded-md border p-0.5 gap-0.5 border-slate-700 bg-black/10 w-36">
                  <button
                    className={cn(
                      "flex-1 py-1 text-[10px] font-medium rounded text-center",
                      layoutMode === "paged" ? activeBtnClass : inactiveBtnClass
                    )}
                    onClick={() => setLayoutMode("paged")}
                  >
                    Paged
                  </button>
                  <button
                    className={cn(
                      "flex-1 py-1 text-[10px] font-medium rounded text-center",
                      layoutMode === "scroll" ? activeBtnClass : inactiveBtnClass
                    )}
                    onClick={() => setLayoutMode("scroll")}
                  >
                    Scroll
                  </button>
                </div>
              </div>

              {/* Font Family Selection */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Font</span>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                  className="h-7 rounded-md border text-xs px-2 bg-transparent outline-none border-slate-700 text-slate-200 w-36"
                >
                  <option value="sans" className="bg-slate-900 text-white">Sans Serif</option>
                  <option value="serif" className="bg-slate-900 text-white">Serif</option>
                  <option value="mono" className="bg-slate-900 text-white">Monospace</option>
                </select>
              </div>

              {/* Font Size Selection */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Size</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as FontSize)}
                  className="h-7 rounded-md border text-xs px-2 bg-transparent outline-none border-slate-700 text-slate-200 w-36"
                >
                  <option value="sm" className="bg-slate-900 text-white">Small</option>
                  <option value="md" className="bg-slate-900 text-white">Medium</option>
                  <option value="lg" className="bg-slate-900 text-white">Large</option>
                  <option value="xl" className="bg-slate-900 text-white">X-Large</option>
                </select>
              </div>

              {/* Font Thickness Selection */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Weight</span>
                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(e.target.value)}
                  className="h-7 rounded-md border text-xs px-2 bg-transparent outline-none border-slate-700 text-slate-200 w-36"
                >
                  <option value="normal" className="bg-slate-900 text-white">Normal</option>
                  <option value="500" className="bg-slate-900 text-white">Medium</option>
                  <option value="bold" className="bg-slate-900 text-white">Bold</option>
                </select>
              </div>

              {/* Line Spacing Selection */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Spacing</span>
                <select
                  value={lineHeight}
                  onChange={(e) => setLineHeight(e.target.value)}
                  className="h-7 rounded-md border text-xs px-2 bg-transparent outline-none border-slate-700 text-slate-200 w-36"
                >
                  <option value="1.2" className="bg-slate-900 text-white">Compact</option>
                  <option value="1.5" className="bg-slate-900 text-white">Normal</option>
                  <option value="1.8" className="bg-slate-900 text-white">Loose</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </ReaderHeader>

      {/* Main Canvas Workspace with Theme-Specific Background */}
      <main
        className={cn(
          "flex-1 flex overflow-hidden relative transition-colors duration-200",
          themePageClasses[theme]
        )}
      >
        {/* Table of Contents Drawer (EPUB) */}
        {isTocOpen && contentType !== "text/plain" && (
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r shadow-2xl z-40 flex flex-col transition-all duration-300 bg-slate-900 border-slate-800 text-slate-100">
            <div className="p-3 border-b border-slate-850 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Table of Contents
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-white"
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
                        className="w-full text-left text-xs px-3 py-2 rounded-md hover:bg-slate-800 hover:text-blue-400 transition-colors truncate"
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
                <p className="text-xs text-slate-450 animate-pulse">Loading EPUB document...</p>
              </div>
            )}
            <div ref={setViewerElement} className="w-full h-full p-2 relative" />

            {/* Paged Layout Overlay click zones */}
            {layoutMode === "paged" && !epubLoading && (
              <div className="absolute inset-0 z-20 flex pointer-events-none" {...swipeProps}>
                <div
                  className="w-[30%] h-full cursor-w-resize pointer-events-auto"
                  onClick={handleEpubPrev}
                  data-testid="epub-prev-zone"
                />
                <div
                  className="w-[40%] h-full cursor-pointer pointer-events-auto"
                  onClick={toggleUiVisibility}
                  data-testid="epub-toggle-zone"
                />
                <div
                  className="w-[30%] h-full cursor-e-resize pointer-events-auto"
                  onClick={handleEpubNext}
                  data-testid="epub-next-zone"
                />
              </div>
            )}
          </div>
        ) : (
          renderTxtView()
        )}
      </main>

      {/* Footer Status Bar - Always Dark */}
      <ReaderFooter
        isVisible={isUiVisible}
        progressText={pageLabel}
        percentage={percentage}
      />
    </ReaderContainer>
  );
}

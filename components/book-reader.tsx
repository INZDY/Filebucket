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
  Settings,
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
  const [isUiVisible, setIsUiVisible] = useState(true);

  const toggleUiVisibility = useCallback(() => {
    setIsUiVisible((prev) => !prev);
  }, []);

  // DOM Refs
  const [viewerElement, setViewerElement] = useState<HTMLDivElement | null>(null);
  const txtScrollContainerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const lastSavedRef = useRef<{ position: string; percentage: number } | null>(null);
  const txtTouchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // SSR-safe mounting check
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
            settings: { theme, layoutMode, fontSize, fontFamily, fontWeight, lineHeight },
          }),
        });
      } catch (err) {
        console.error("Failed to save progress:", err);
      }
    },
    [mediaId, theme, layoutMode, fontSize, fontFamily, fontWeight, lineHeight]
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

    if (currentPosition) {
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
  const PAGE_SIZE = 1500; // character count per page
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
    if (contentType === "text/plain" && layoutMode === "paged" && txtPages.length > 0 && progressLoaded) {
      const pct = txtPages.length > 1 ? (txtPageIndex / (txtPages.length - 1)) * 100 : 100;
      setPercentage(pct);
      saveProgressDebounced(String(txtPageIndex), pct);
    }
  }, [txtPageIndex, layoutMode, txtPages.length, contentType, saveProgressDebounced, progressLoaded]);

  // EPUB initialization
  useEffect(() => {
    if (contentType === "text/plain" || !url || !isOpen || !viewerElement || !progressLoaded) return;

    // Clear previous viewer content to prevent duplicate iframe nodes
    viewerElement.innerHTML = "";

    setEpubLoading(true);

    let bookInstance: any = null;
    let renditionInstance: any = null;
    let active = true;

    const initEpub = async () => {
      try {
        // Add cache-buster to prevent browser redirect caches
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

        // Add error listeners to capture swallowed exceptions
        bookInstance.on("openFailed", (err: any) => {
          console.error("[EPUB-DIAG] ePub openFailed event:", err);
        });

        renditionInstance.on("displayerror", (err: any) => {
          console.error("[EPUB-DIAG] Rendition displayerror event:", err);
        });

        // Add keyboard navigation inside the iframe
        renditionInstance.on("keydown", (event: any) => {
          if (event.key === "ArrowLeft") {
            renditionInstance.prev();
          } else if (event.key === "ArrowRight") {
            renditionInstance.next();
          }
        });

        // Add tap/click for page turns (sides) and UI toggle (middle)
        renditionInstance.on("click", (event: any) => {
          let targetEl = event.target as HTMLElement | null;
          if (targetEl && targetEl.nodeType === 3) {
            targetEl = targetEl.parentElement;
          }
          if (targetEl && typeof targetEl.closest === "function" && (targetEl.closest("a") || targetEl.closest("button"))) {
            return;
          }
          const ownerDoc = targetEl?.ownerDocument;
          const width = ownerDoc?.documentElement?.clientWidth || window.innerWidth;
          const x = event.clientX;
          if (x < width * 0.3) {
            renditionInstance.prev();
          } else if (x > width * 0.7) {
            renditionInstance.next();
          } else {
            toggleUiVisibility();
          }
        });

        // Add touch/swipe navigation inside the iframe
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        renditionInstance.on("touchstart", (event: TouchEvent) => {
          if (event.touches.length === 1) {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
            touchStartTime = Date.now();
          }
        });

        renditionInstance.on("touchend", (event: TouchEvent) => {
          if (event.changedTouches.length === 1) {
            const touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            const elapsedTime = Date.now() - touchStartTime;

            let targetEl = event.target as HTMLElement | null;
            if (targetEl && targetEl.nodeType === 3) {
              targetEl = targetEl.parentElement;
            }
            if (targetEl && typeof targetEl.closest === "function" && (targetEl.closest("a") || targetEl.closest("button"))) {
              return;
            }

            // Swipe horizontal detection (threshold: 50px, duration < 500ms, mostly horizontal)
            if (
              elapsedTime < 500 &&
              Math.abs(diffX) > 50 &&
              Math.abs(diffY) < 100
            ) {
              if (diffX > 0) {
                renditionInstance.prev();
              } else {
                renditionInstance.next();
              }
              // Prevent default click synthesis if it's a swipe
              event.preventDefault();
            } else if (elapsedTime < 300 && Math.abs(diffX) < 15 && Math.abs(diffY) < 15) {
              // This is a tap!
              const ownerDoc = targetEl?.ownerDocument;
              const width = ownerDoc?.documentElement?.clientWidth || window.innerWidth;
              const x = touchEndX;
              if (x < width * 0.3) {
                renditionInstance.prev();
              } else if (x > width * 0.7) {
                renditionInstance.next();
              } else {
                toggleUiVisibility();
              }
              // Prevent synthesized click
              event.preventDefault();
            }
          }
        });

        // Load Table of Contents
        bookInstance.loaded.navigation.then((nav: any) => {
          console.log("[EPUB-DIAG] Navigation loaded. Chapters count:", nav.toc?.length || 0);
          if (active) setToc(nav.toc || []);
        });

        // Handle relocated event to track progress
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

        // Display book at initial CFI or start
        console.log("[EPUB-DIAG] Waiting for bookInstance.ready...");
        await bookInstance.ready;
        console.log("[EPUB-DIAG] bookInstance.ready resolved.");
        if (!active) return;

        const targetCfi = currentCfi || undefined;
        console.log("[EPUB-DIAG] Displaying book at targetCfi:", targetCfi);
        await renditionInstance.display(targetCfi);
        console.log("[EPUB-DIAG] book displayed successfully.");

        if (active) setEpubLoading(false);

        // Generate locations for percentage calculation
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
        if (renditionInstance) renditionInstance.destroy();
        if (bookInstance) bookInstance.destroy();
      } catch (e) {
        console.error(e);
      }
      setRendition(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, contentType, isOpen, layoutMode, viewerElement, toggleUiVisibility, progressLoaded]);

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

    // Register themes in epubjs iframe dynamically incorporating active font family and text overlays
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

  // EPUB Page Turning handlers
  const handleEpubNext = useCallback(() => {
    if (rendition) rendition.next();
  }, [rendition]);

  const handleEpubPrev = useCallback(() => {
    if (rendition) rendition.prev();
  }, [rendition]);

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

  const handleTxtTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      txtTouchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTxtTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - txtTouchStartRef.current.x;
      const diffY = touchEndY - txtTouchStartRef.current.y;
      const elapsedTime = Date.now() - txtTouchStartRef.current.time;

      const target = e.target as HTMLElement;
      if (target && (target.closest("button") || target.closest("a"))) {
        return;
      }

      if (
        elapsedTime < 500 &&
        Math.abs(diffX) > 50 &&
        Math.abs(diffY) < 100
      ) {
        if (diffX > 0) {
          setTxtPageIndex((p) => Math.max(0, p - 1));
        } else {
          setTxtPageIndex((p) => Math.min(txtPages.length - 1, p + 1));
        }
        e.preventDefault();
      } else if (elapsedTime < 300 && Math.abs(diffX) < 15 && Math.abs(diffY) < 15) {
        // It's a tap!
        if (layoutMode === "paged") {
          const width = e.currentTarget.clientWidth;
          const x = touchEndX - e.currentTarget.getBoundingClientRect().left;
          if (x < width * 0.3) {
            setTxtPageIndex((p) => Math.max(0, p - 1));
          } else if (x > width * 0.7) {
            setTxtPageIndex((p) => Math.min(txtPages.length - 1, p + 1));
          } else {
            toggleUiVisibility();
          }
        } else {
          toggleUiVisibility();
        }
        e.preventDefault();
      }
    }
  };

  const handleTxtPageClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }

    if (layoutMode === "paged") {
      const width = e.currentTarget.clientWidth;
      const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
      if (x < width * 0.3) {
        setTxtPageIndex((p) => Math.max(0, p - 1));
      } else if (x > width * 0.7) {
        setTxtPageIndex((p) => Math.min(txtPages.length - 1, p + 1));
      } else {
        toggleUiVisibility();
      }
    } else {
      toggleUiVisibility();
    }
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
        <div 
          onClick={handleTxtPageClick}
          onTouchStart={handleTxtTouchStart}
          onTouchEnd={handleTxtTouchEnd}
          className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative cursor-pointer"
        >
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

          {/* Navigation overlay buttons */}
          <div className="hidden md:flex absolute inset-y-0 left-2 items-center">
            <Button
              variant="outline"
              size="icon"
              className={cn("rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 shadow-lg", controlClasses[theme])}
              onClick={() => setTxtPageIndex((p) => Math.max(0, p - 1))}
              disabled={txtPageIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="hidden md:flex absolute inset-y-0 right-2 items-center">
            <Button
              variant="outline"
              size="icon"
              className={cn("rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 shadow-lg", controlClasses[theme])}
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
        onClick={handleTxtPageClick}
        onTouchStart={handleTxtTouchStart}
        onTouchEnd={handleTxtTouchEnd}
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

  // Progress Bar styling helpers
  const progressFillClasses: Record<ThemeName, string> = {
    dark: "bg-blue-600",
    light: "bg-blue-600",
    sepia: "bg-[#7c695b]",
  };

  const progressTrackClasses: Record<ThemeName, string> = {
    dark: "bg-slate-800",
    light: "bg-slate-200",
    sepia: "bg-[#e2d7b4]",
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
          "absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 border-b shadow-md z-50 transition-opacity duration-150",
          isUiVisible ? "opacity-100" : "opacity-0 pointer-events-none",
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
        <div className="flex items-center gap-1.5 relative">
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

          {/* Settings Dropdown Button */}
          <Button
            ref={settingsBtnRef}
            variant="outline"
            size="sm"
            data-testid="settings-toggle"
            className={cn("h-8 px-2.5 text-xs gap-1", controlClasses[theme])}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          {/* Dropdown panel */}
          {isSettingsOpen && (
            <div
              ref={settingsRef}
              data-testid="settings-dropdown"
              className={cn(
                "fixed right-2 left-2 top-16 md:absolute md:right-0 md:left-auto md:top-10 w-auto md:w-72 p-4 rounded-lg border shadow-xl z-[60] space-y-3.5",
                controlClasses[theme]
              )}
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
                        "flex-1 py-1 text-[10px] font-medium rounded text-center",
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
                        "flex-1 py-1 text-[10px] font-medium rounded text-center",
                        theme === "dark"
                          ? activeBtnClasses[theme]
                          : "text-slate-400 hover:text-slate-200"
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
                        layoutMode === "paged"
                          ? activeBtnClasses[theme]
                          : "text-slate-400 hover:text-slate-200"
                      )}
                      onClick={() => setLayoutMode("paged")}
                    >
                      Paged
                    </button>
                    <button
                      className={cn(
                        "flex-1 py-1 text-[10px] font-medium rounded text-center",
                        layoutMode === "scroll"
                          ? activeBtnClasses[theme]
                          : "text-slate-400 hover:text-slate-200"
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
                    className={cn("h-7 rounded-md border text-xs px-2 bg-transparent outline-none w-36", controlClasses[theme])}
                  >
                    <option value="sans" className="bg-[#1e293b] text-white">Sans Serif</option>
                    <option value="serif" className="bg-[#1e293b] text-white">Serif</option>
                    <option value="mono" className="bg-[#1e293b] text-white">Monospace</option>
                  </select>
                </div>

                {/* Font Size Selection */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Size</span>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as FontSize)}
                    className={cn("h-7 rounded-md border text-xs px-2 bg-transparent outline-none w-36", controlClasses[theme])}
                  >
                    <option value="sm" className="bg-[#1e293b] text-white">Small</option>
                    <option value="md" className="bg-[#1e293b] text-white">Medium</option>
                    <option value="lg" className="bg-[#1e293b] text-white">Large</option>
                    <option value="xl" className="bg-[#1e293b] text-white">X-Large</option>
                  </select>
                </div>

                {/* Font Thickness Selection */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Weight</span>
                  <select
                    value={fontWeight}
                    onChange={(e) => setFontWeight(e.target.value)}
                    className={cn("h-7 rounded-md border text-xs px-2 bg-transparent outline-none w-36", controlClasses[theme])}
                  >
                    <option value="normal" className="bg-[#1e293b] text-white">Normal</option>
                    <option value="500" className="bg-[#1e293b] text-white">Medium</option>
                    <option value="bold" className="bg-[#1e293b] text-white">Bold</option>
                  </select>
                </div>

                {/* Line Spacing Selection */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Spacing</span>
                  <select
                    value={lineHeight}
                    onChange={(e) => setLineHeight(e.target.value)}
                    className={cn("h-7 rounded-md border text-xs px-2 bg-transparent outline-none w-36", controlClasses[theme])}
                  >
                    <option value="1.2" className="bg-[#1e293b] text-white">Compact</option>
                    <option value="1.5" className="bg-[#1e293b] text-white">Normal</option>
                    <option value="1.8" className="bg-[#1e293b] text-white">Loose</option>
                  </select>
                </div>
              </div>
            </div>
          )}

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
      <main
        className={cn(
          "flex-1 flex overflow-hidden relative",
          isUiVisible ? "pt-14 pb-12 md:pb-8" : "pt-0 pb-0"
        )}
      >
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
            <div ref={setViewerElement} className="w-full h-full p-2 relative" />

            {/* Paged Layout Overlay controls */}
            {layoutMode === "paged" && !epubLoading && (
              <>
                <div className="hidden md:flex absolute inset-y-0 left-2 items-center z-20">
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
                <div className="hidden md:flex absolute inset-y-0 right-2 items-center z-20">
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
          "absolute bottom-0 left-0 right-0 h-12 md:h-8 flex items-center justify-between px-4 border-t text-[10px] font-mono z-50 transition-opacity duration-150",
          isUiVisible ? "opacity-100" : "opacity-0 pointer-events-none",
          controlClasses[theme]
        )}
      >
        <div className="w-full flex flex-col md:flex-row md:items-center justify-center md:justify-end gap-1.5 md:gap-3">
          {/* Page info label (Left of bar on desktop, Top on mobile) */}
          <span className="shrink-0 text-slate-400 text-center md:text-left">
            {pageLabel}
          </span>

          {/* Visual Progress Bar (Right of label on desktop, Bottom on mobile) */}
          <div className={cn("w-32 md:w-48 h-1 rounded-full overflow-hidden self-center md:self-auto", progressTrackClasses[theme])}>
            <div
              className={cn("h-full transition-all duration-150", progressFillClasses[theme])}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
        </div>
      </footer>
    </div>,
    document.body
  );
}

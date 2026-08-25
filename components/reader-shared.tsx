"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ==========================================
// 1. ReaderContainer
// ==========================================
type ReaderContainerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function ReaderContainer({
  isOpen,
  onClose,
  children,
  className,
}: ReaderContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // SSR safety
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Body Scroll Lock & Escape Key Listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-[#0b0c10] text-slate-100 select-none animate-fade-in",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

// ==========================================
// 2. ReaderHeader
// ==========================================
type ReaderHeaderProps = {
  title: string;
  onClose: () => void;
  children?: React.ReactNode; // custom controls slot
  className?: string;
  isVisible?: boolean;
};

export function ReaderHeader({
  title,
  onClose,
  children,
  className,
  isVisible = true,
}: ReaderHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-[#111318]/95 px-4 backdrop-blur-md z-30 transition-opacity duration-300",
        isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Button
          data-testid="close-reader"
          aria-label="Exit reader"
          className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:scale-95 transition-transform"
          onClick={onClose}
          size="icon"
          variant="ghost"
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="min-w-0 max-w-[150px] sm:max-w-xs md:max-w-md">
          <h2 className="truncate text-sm font-semibold text-slate-200" title={title}>
            {title}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

// ==========================================
// 3. ReaderFooter
// ==========================================
type ReaderFooterProps = {
  progressText?: string;
  percentage?: number;
  className?: string;
  isVisible?: boolean;
};

export function ReaderFooter({
  progressText,
  percentage = 0,
  className,
  isVisible = true,
}: ReaderFooterProps) {
  return (
    <div
      className={cn(
        "flex h-12 w-full items-center justify-between border-t border-slate-800/80 bg-[#111318]/95 px-4 backdrop-blur-md z-30 transition-opacity duration-300",
        isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        className
      )}
    >
      <div className="flex-1 flex items-center justify-between gap-4">
        {/* Progress Bar */}
        <div className="flex-1 max-w-[200px] h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
          />
        </div>
        {progressText && (
          <span className="text-[10px] sm:text-xs font-medium text-slate-400">
            {progressText}
          </span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. Hooks
// ==========================================

// useReaderOverlay - toggles reader UI controls visibility
export function useReaderOverlay(initialState = true) {
  const [isUiVisible, setIsUiVisible] = useState(initialState);

  const toggleUiVisibility = useCallback(() => {
    setIsUiVisible((prev) => !prev);
  }, []);

  return {
    isUiVisible,
    setIsUiVisible,
    toggleUiVisibility,
  };
}

// useReaderSwipe - mobile gesture listener
type SwipeHandlersProps = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isRtl?: boolean;
};

export function useReaderSwipe({ onSwipeLeft, onSwipeRight, isRtl = false }: SwipeHandlersProps) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length === 1 && touchStartRef.current) {
        const touchStartX = touchStartRef.current.x;
        const touchStartY = touchStartRef.current.y;
        const touchStartTime = touchStartRef.current.time;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const elapsedTime = Date.now() - touchStartTime;

        // Threshold parameters: horizontal swipe length > 50px, duration < 500ms, mostly horizontal
        if (elapsedTime < 500 && Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
          if (diffX > 0) {
            // Swipe Right
            if (isRtl) {
              onSwipeLeft(); // Next page in RTL
            } else {
              onSwipeRight(); // Prev page in LTR
            }
          } else {
            // Swipe Left
            if (isRtl) {
              onSwipeRight(); // Prev page in RTL
            } else {
              onSwipeLeft(); // Next page in LTR
            }
          }
          touchStartRef.current = null;
          e.preventDefault();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, isRtl]
  );

  return {
    onTouchStart,
    onTouchEnd,
  };
}

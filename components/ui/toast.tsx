"use client";

import { useEffect, useState } from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";

type ToastItem = {
  id: number;
  title: string;
  variant: ToastVariant;
};

const TOAST_EVENT = "app-toast";
const MAX_TOASTS = 3;

function emitToast(title: string, variant: ToastVariant) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { title, variant } }));
}

export function toastSuccess(title: string) {
  emitToast(title, "success");
}

export function toastError(title: string) {
  emitToast(title, "error");
}

/**
 * Mounts the toast viewport and renders toasts pushed through `toastSuccess`
 * and `toastError`. Successes dismiss themselves; errors stay until dismissed.
 */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const { title, variant } = (event as CustomEvent<{ title: string; variant: ToastVariant }>)
        .detail;
      setToasts((prev) => [
        ...prev.slice(-(MAX_TOASTS - 1)),
        { id: Date.now() + Math.random(), title, variant },
      ]);
    };

    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  return (
    <ToastPrimitives.Provider swipeDirection="right">
      {toasts.map((item) => (
        <ToastPrimitives.Root
          key={item.id}
          duration={item.variant === "error" ? Infinity : 4000}
          onOpenChange={(open) => {
            if (!open) {
              setToasts((prev) => prev.filter((toast) => toast.id !== item.id));
            }
          }}
          className={cn(
            "flex items-start justify-between gap-3 rounded-md border px-4 py-3 shadow-lg",
            item.variant === "error"
              ? "border-rose-900/60 bg-[#2a1418] text-rose-100"
              : "border-slate-800 bg-[#191c22] text-slate-100"
          )}
        >
          <ToastPrimitives.Title className="text-sm font-medium leading-5">
            {item.title}
          </ToastPrimitives.Title>
          <ToastPrimitives.Close
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-100"
          >
            <X className="h-3.5 w-3.5" />
          </ToastPrimitives.Close>
        </ToastPrimitives.Root>
      ))}
      <ToastPrimitives.Viewport className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 outline-none" />
    </ToastPrimitives.Provider>
  );
}

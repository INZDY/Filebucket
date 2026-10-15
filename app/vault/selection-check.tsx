"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Selection-mode indicator for a vault card. Rendered outside the card's link
 * (see 7ccd2d9) so the card stays navigable when selection mode is off.
 */
export function SelectionCheck({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-xl p-2",
        className
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
          selected
            ? "border-blue-300 bg-blue-600 text-white"
            : "border-slate-300 bg-slate-900/70 text-transparent"
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

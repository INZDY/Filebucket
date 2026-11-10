"use client";

import Link from "next/link";
import type { DragEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BreadcrumbDrag = {
  active: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

export type BreadcrumbItem = {
  name: string;
  href?: string;
  drag?: BreadcrumbDrag;
};

export function PageBreadcrumb({
  items,
  meta,
}: {
  items: BreadcrumbItem[];
  meta?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-400">
      {items.map((item, index) => (
        <span key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-2">
          {index > 0 ? <span className="text-slate-600">/</span> : null}
          {item.href ? (
            <Link
              className={cn(
                "font-medium text-slate-300 transition-colors hover:text-slate-100",
                item.drag?.active && "font-semibold text-amber-500"
              )}
              href={item.href}
              onDragLeave={item.drag?.onDragLeave}
              onDragOver={
                item.drag
                  ? (event) => {
                      event.preventDefault();
                      item.drag?.onDragOver();
                    }
                  : undefined
              }
              onDrop={item.drag?.onDrop}
            >
              {item.name}
            </Link>
          ) : (
            <span className="max-w-56 truncate font-medium text-slate-200">{item.name}</span>
          )}
        </span>
      ))}
      {meta ? (
        <>
          <span className="text-slate-500">•</span>
          <span className="text-xs text-slate-500">{meta}</span>
        </>
      ) : null}
    </div>
  );
}

export function PageHeader({
  breadcrumb,
  actions,
}: {
  breadcrumb: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#191c22] px-5 py-2.5">
      <div className="min-w-0">{breadcrumb}</div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

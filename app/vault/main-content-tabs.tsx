"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { FileText, Folder, ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContentTab = {
  id: string;
  type: "note" | "media" | "folder";
  title: string;
  href: string;
};

type MainContentTabsProps = {
  activeTab?: ContentTab;
  existingIds?: string[];
  fallbackHref: string;
  children: ReactNode;
  activeMode?: "FILES" | "NOTES" | "KEEP" | "CHAT" | "TRASH";
};

export function MainContentTabs({
  activeTab,
  existingIds,
  fallbackHref,
  children,
  activeMode = "FILES",
}: MainContentTabsProps) {
  const router = useRouter();
  const [tabsByMode, setTabsByMode] = useState<Record<"NOTES", ContentTab[]>>({
    NOTES: [],
  });
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  useEffect(() => {
    if (!activeTab || activeMode !== "NOTES") {
      return;
    }

    setTabsByMode((prev) => {
      const currentTabs = prev.NOTES;
      const existingIndex = currentTabs.findIndex((tab) => {
        return tab.id === activeTab.id && tab.type === activeTab.type;
      });

      if (existingIndex === -1) {
        return {
          ...prev,
          NOTES: [...currentTabs, activeTab],
        };
      }

      return {
        ...prev,
        NOTES: currentTabs.map((tab, index) => index === existingIndex ? activeTab : tab),
      };
    });
  }, [activeTab, activeMode]);

  useEffect(() => {
    if (existingIds) {
      setTabsByMode((prev) => ({
        NOTES: prev.NOTES.filter((tab) => existingIds.includes(tab.id)),
      }));
    }
  }, [existingIds]);

  function closeTab(tabToClose: ContentTab) {
    if (activeMode !== "NOTES") return;

    setTabsByMode((prev) => ({
      ...prev,
      NOTES: prev.NOTES.filter((tab) => tab.id !== tabToClose.id || tab.type !== tabToClose.type),
    }));

    if (activeTab?.id === tabToClose.id && activeTab.type === tabToClose.type) {
      router.push(fallbackHref);
    }
  }

  const currentTabs = activeMode === "NOTES" ? tabsByMode.NOTES : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {currentTabs.length > 0 ? (
        <>
          {/* Desktop tab bar */}
          <div className="hidden md:flex min-h-11 items-end overflow-x-auto border-b border-slate-800 bg-[#151820] px-2 pt-2">
            {currentTabs.map((tab) => {
              const isActive = activeTab?.id === tab.id && activeTab.type === tab.type;
              const Icon = tab.type === "note" ? FileText : tab.type === "folder" ? Folder : ImagePlus;

              return (
                <div
                  key={`${tab.type}:${tab.id}`}
                  className={cn(
                    "group flex h-9 min-w-0 max-w-56 items-center gap-2 rounded-t-md border border-b-0 px-2 text-sm",
                    isActive
                      ? "border-slate-700 bg-[#191c22] text-slate-50"
                      : "border-transparent bg-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-100",
                  )}
                >
                  <Link className="flex min-w-0 flex-1 items-center gap-2" href={tab.href}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tab.title}</span>
                  </Link>
                  <Button
                    aria-label={`Close ${tab.title}`}
                    className="h-6 w-6 shrink-0 text-slate-500 hover:bg-slate-700 hover:text-slate-50"
                    onClick={() => closeTab(tab)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Mobile Tab Header Adaption */}
          <div className="flex md:hidden h-12 items-center justify-between border-b border-slate-800 bg-[#151820] px-4 py-2 shrink-0">
            <span className="truncate text-sm font-medium text-slate-200">
              {activeTab ? activeTab.title : "No open note"}
            </span>
            <Button
              className="h-8 gap-1.5 border-slate-700 bg-[#191c22] px-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              onClick={() => setIsBottomSheetOpen(true)}
              size="sm"
              variant="outline"
              type="button"
            >
              <span>Tabs</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600/30 text-[10px] font-bold text-purple-300">
                {currentTabs.length}
              </span>
            </Button>
          </div>

          {/* Bottom Sheet Tab Switcher */}
          <div
            className={cn(
              "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ease-in-out md:hidden",
              isBottomSheetOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsBottomSheetOpen(false)}
          >
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 max-h-[75vh] rounded-t-xl border-t border-slate-800 bg-[#171a20] p-4 pb-8 shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col",
                isBottomSheetOpen ? "translate-y-0" : "translate-y-full"
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Open Tabs ({currentTabs.length})</span>
                <Button
                  aria-label="Close tab switcher"
                  className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  onClick={() => setIsBottomSheetOpen(false)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {currentTabs.map((tab) => {
                  const isActive = activeTab?.id === tab.id && activeTab.type === tab.type;
                  const Icon = tab.type === "note" ? FileText : tab.type === "folder" ? Folder : ImagePlus;

                  return (
                    <div
                      key={`sheet:${tab.type}:${tab.id}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-3 text-sm transition-colors",
                        isActive
                          ? "border-purple-500/40 bg-purple-950/20 text-purple-200"
                          : "border-slate-800 bg-[#1c202a] text-slate-300 hover:bg-slate-800"
                      )}
                    >
                      <Link
                        className="flex min-w-0 flex-1 items-center gap-3"
                        href={tab.href}
                        onClick={() => setIsBottomSheetOpen(false)}
                      >
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        <span className="truncate font-medium">{tab.title}</span>
                      </Link>
                      <Button
                        aria-label={`Close ${tab.title}`}
                        className="h-8 w-8 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                        onClick={() => closeTab(tab)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}


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
};

export function MainContentTabs({ activeTab, existingIds, fallbackHref, children }: MainContentTabsProps) {
  const router = useRouter();
  const [tabs, setTabs] = useState<ContentTab[]>([]);

  useEffect(() => {
    if (!activeTab) {
      return;
    }

    setTabs((currentTabs) => {
      const existingIndex = currentTabs.findIndex((tab) => {
        if (activeTab.type === "media") {
          return tab.type === "media";
        }
        return tab.id === activeTab.id && tab.type === activeTab.type;
      });

      if (existingIndex === -1) {
        return [...currentTabs, activeTab];
      }

      return currentTabs.map((tab, index) => index === existingIndex ? activeTab : tab);
    });
  }, [activeTab]);

  useEffect(() => {
    if (existingIds) {
      setTabs((currentTabs) => currentTabs.filter((tab) => existingIds.includes(tab.id)));
    }
  }, [existingIds]);

  function closeTab(tabToClose: ContentTab) {
    setTabs((currentTabs) =>
      currentTabs.filter((tab) => tab.id !== tabToClose.id || tab.type !== tabToClose.type),
    );

    if (activeTab?.id === tabToClose.id && activeTab.type === tabToClose.type) {
      router.push(fallbackHref);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {tabs.length > 0 ? (
        <div className="flex min-h-11 items-end overflow-x-auto border-b border-slate-800 bg-[#151820] px-2 pt-2">
          {tabs.map((tab) => {
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
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}


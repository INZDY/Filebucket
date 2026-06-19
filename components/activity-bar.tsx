import React from "react";
import { Folder, BookOpen, StickyNote, MessageSquare } from "lucide-react";

interface ActivityBarProps {
  activeMode: "FILES" | "NOTES" | "KEEP" | "CHAT";
  notesRootId: string | null;
  keepRootId: string | null;
  chatRootId: string | null;
}

export function ActivityBar({
  activeMode,
  notesRootId,
  keepRootId,
  chatRootId,
}: ActivityBarProps) {
  const items = [
    {
      mode: "FILES" as const,
      label: "Files",
      icon: Folder,
      href: "/",
    },
    {
      mode: "NOTES" as const,
      label: "Notes",
      icon: BookOpen,
      href: notesRootId ? `/?folder=${notesRootId}` : "#",
    },
    {
      mode: "KEEP" as const,
      label: "Keep",
      icon: StickyNote,
      href: keepRootId ? `/?folder=${keepRootId}` : "#",
    },
    {
      mode: "CHAT" as const,
      label: "Chat",
      icon: MessageSquare,
      href: chatRootId ? `/?folder=${chatRootId}` : "#",
    },
  ];

  return (
    <nav
      className="flex h-16 w-full flex-row items-center justify-around border-t border-slate-800/40 bg-[#0f0f13]/90 backdrop-blur-md md:h-full md:w-16 md:flex-col md:justify-start md:border-r md:border-t-0 md:py-6 md:gap-5"
      aria-label="Activity Bar"
    >
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeMode === item.mode;

        return (
          <a
            key={item.mode}
            href={item.href}
            title={item.label}
            className={`group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
              isActive
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                : "text-slate-400 border border-transparent hover:bg-slate-800/30 hover:text-slate-200"
            }`}
          >
            <IconComponent className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
            {/* Active Indicator Pip */}
            {isActive && (
              <span className="absolute -left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-md bg-purple-500 hidden md:block" />
            )}
            {isActive && (
              <span className="absolute -top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-b-md bg-purple-500 md:hidden" />
            )}
          </a>
        );
      })}
    </nav>
  );
}

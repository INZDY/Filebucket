import React from "react";
import { Folder, BookOpen, StickyNote, MessageSquare, Trash2, Settings } from "lucide-react";

interface ActivityBarProps {
  activeMode: "FILES" | "NOTES" | "KEEP" | "CHAT" | "TRASH";
  notesRootId: string | null;
  keepRootId: string | null;
  chatRootId: string | null;
  onOpenSettings?: () => void;
}

const modeStyles = {
  FILES: {
    active: "bg-gradient-to-b from-blue-600/20 to-transparent md:bg-gradient-to-l md:from-blue-600/20 md:to-transparent text-blue-400 border-transparent shadow-none",
    hover: "hover:bg-blue-600/10 hover:text-blue-300 hover:border-transparent",
  },
  NOTES: {
    active: "bg-gradient-to-b from-purple-600/20 to-transparent md:bg-gradient-to-l md:from-purple-600/20 md:to-transparent text-purple-400 border-transparent shadow-none",
    hover: "hover:bg-purple-600/10 hover:text-purple-300 hover:border-transparent",
  },
  KEEP: {
    active: "bg-gradient-to-b from-amber-500/15 to-transparent md:bg-gradient-to-l md:from-amber-500/15 md:to-transparent text-amber-500 border-transparent shadow-none",
    hover: "hover:bg-amber-500/5 hover:text-amber-400 hover:border-transparent",
  },
  CHAT: {
    active: "bg-gradient-to-b from-indigo-600/20 to-transparent md:bg-gradient-to-l md:from-indigo-600/20 md:to-transparent text-indigo-400 border-transparent shadow-none",
    hover: "hover:bg-indigo-600/10 hover:text-indigo-300 hover:border-transparent",
  },
  TRASH: {
    active: "bg-gradient-to-b from-rose-600/20 to-transparent md:bg-gradient-to-l md:from-rose-600/20 md:to-transparent text-rose-400 border-transparent shadow-none",
    hover: "hover:bg-rose-600/10 hover:text-rose-300 hover:border-transparent",
  },
};

export function ActivityBar({
  activeMode,
  notesRootId,
  keepRootId,
  chatRootId,
  onOpenSettings,
}: ActivityBarProps) {
  const mainItems = [
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

  const trashItem = {
    mode: "TRASH" as const,
    label: "Trash",
    icon: Trash2,
    href: "/?view=trash",
  };
  const items = [...mainItems, trashItem];

  return (
    <nav
      className="flex h-12 w-full flex-row items-center justify-around border-t border-slate-800/40 bg-[#0f0f13]/90 backdrop-blur-md md:h-full md:w-12 md:flex-col md:justify-start md:gap-0 md:border-r md:border-t-0 md:py-0 md:px-0"
      aria-label="Activity Bar"
    >
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeMode === item.mode;
        const styles = modeStyles[item.mode];

        return (
          <React.Fragment key={item.mode}>
            {item.mode === "TRASH" && (
              <div className="hidden md:block w-6 h-px bg-slate-800/40 my-1 shrink-0 mt-auto" />
            )}
            <a
              href={item.href}
              title={item.label}
              className={`group relative flex items-center justify-center rounded-none transition-all duration-200 border flex-1 md:flex-initial h-full md:h-16 md:w-full ${
                isActive
                  ? `${styles.active}`
                  : `text-slate-400 border-transparent ${styles.hover} hover:bg-slate-800/30`
              }`}
            >
              <IconComponent className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
            </a>
          </React.Fragment>
        );
      })}
      <button
        type="button"
        title="Settings"
        onClick={onOpenSettings}
        className="hidden md:flex group relative h-16 w-full items-center justify-center rounded-none transition-all duration-200 border border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 shrink-0"
      >
        <Settings className="h-5 w-5 transition-transform duration-200 group-hover:rotate-45" />
      </button>
    </nav>
  );
}


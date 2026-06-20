import React from "react";
import { Folder, BookOpen, StickyNote, MessageSquare, Trash2 } from "lucide-react";

interface ActivityBarProps {
  activeMode: "FILES" | "NOTES" | "KEEP" | "CHAT" | "TRASH";
  notesRootId: string | null;
  keepRootId: string | null;
  chatRootId: string | null;
}

const modeStyles = {
  FILES: {
    active: "bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    hover: "hover:bg-blue-600/10 hover:text-blue-300 hover:border-blue-500/20",
  },
  NOTES: {
    active: "bg-purple-600/20 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]",
    hover: "hover:bg-purple-600/10 hover:text-purple-300 hover:border-purple-500/20",
  },
  KEEP: {
    active: "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    hover: "hover:bg-amber-500/5 hover:text-amber-400 hover:border-amber-500/10",
  },
  CHAT: {
    active: "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]",
    hover: "hover:bg-indigo-600/10 hover:text-indigo-300 hover:border-indigo-500/20",
  },
  TRASH: {
    active: "bg-rose-600/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
    hover: "hover:bg-rose-600/10 hover:text-rose-300 hover:border-rose-500/20",
  },
};

export function ActivityBar({
  activeMode,
  notesRootId,
  keepRootId,
  chatRootId,
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

  const renderItemButton = (item: typeof mainItems[number] | typeof trashItem) => {
    const IconComponent = item.icon;
    const isActive = activeMode === item.mode;
    const styles = modeStyles[item.mode];

    return (
      <a
        key={item.mode}
        href={item.href}
        title={item.label}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 border ${
          isActive
            ? `${styles.active}`
            : `text-slate-400 border-transparent ${styles.hover} hover:bg-slate-800/30`
        }`}
      >
        <IconComponent className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
      </a>
    );
  };

  return (
    <nav
      className="flex h-16 w-full flex-row items-center justify-around border-t border-slate-800/40 bg-[#0f0f13]/90 backdrop-blur-md md:h-full md:w-12 md:flex-col md:justify-between md:border-r md:border-t-0 md:py-4 md:px-0"
      aria-label="Activity Bar"
    >
      {/* Modes Group */}
      <div className="flex flex-row items-center justify-around flex-[4] h-full md:flex-initial md:flex-col md:justify-start md:gap-3 md:w-full">
        {mainItems.map(renderItemButton)}
      </div>

      {/* Spacer / Divider for desktop */}
      <div className="hidden md:block w-6 h-px bg-slate-800/40 my-1 shrink-0" />

      {/* Trash Group */}
      <div className="flex flex-row items-center justify-center flex-1 h-full md:flex-initial md:w-full">
        {renderItemButton(trashItem)}
      </div>
    </nav>
  );
}


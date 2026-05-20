"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

type ResizableVaultProps = {
  folders: ReactNode;
  items: ReactNode;
  detail: ReactNode;
};

export function ResizableVault({ folders, items, detail }: ResizableVaultProps) {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsNarrow(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <Group
      defaultLayout={{
        folders: isNarrow ? 28 : 20,
        items: isNarrow ? 34 : 28,
        detail: isNarrow ? 38 : 52,
      }}
      id="filebucket-vault-panes"
      orientation={isNarrow ? "vertical" : "horizontal"}
      className="min-h-0 flex-1"
    >
      <Panel
        className="min-h-0 min-w-0"
        defaultSize={isNarrow ? "28%" : "20%"}
        id="folders"
        minSize={isNarrow ? "180px" : "220px"}
        maxSize={isNarrow ? "45%" : "360px"}
      >
        {folders}
      </Panel>
      <ResizeHandle isNarrow={isNarrow} />
      <Panel
        className="min-h-0 min-w-0"
        defaultSize={isNarrow ? "34%" : "30%"}
        id="items"
        minSize={isNarrow ? "260px" : "300px"}
        maxSize={isNarrow ? "55%" : "520px"}
      >
        {items}
      </Panel>
      <ResizeHandle isNarrow={isNarrow} />
      <Panel
        className="min-h-0 min-w-0"
        defaultSize={isNarrow ? "38%" : "50%"}
        id="detail"
        minSize={isNarrow ? "320px" : "420px"}
      >
        {detail}
      </Panel>
    </Group>
  );
}

function ResizeHandle({ isNarrow }: { isNarrow: boolean }) {
  return (
    <Separator
      className={cn(
        "group relative bg-border transition-colors hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isNarrow ? "h-px" : "w-px",
      )}
    >
      <span
        className={cn(
          "absolute rounded-full bg-slate-300 transition-colors group-hover:bg-teal-600",
          isNarrow
            ? "left-1/2 top-1/2 h-1 w-10 -translate-x-1/2 -translate-y-1/2"
            : "left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2",
        )}
      />
    </Separator>
  );
}

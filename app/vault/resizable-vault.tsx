"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

type ResizableVaultProps = {
  browser: ReactNode;
  content: ReactNode;
  outline?: ReactNode;
};

export function ResizableVault({ browser, content, outline }: ResizableVaultProps) {
  const [isNarrow, setIsNarrow] = useState(false);
  const hasOutline = Boolean(outline);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsNarrow(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <Group
      defaultLayout={hasOutline
        ? {
            browser: isNarrow ? 32 : 25,
            content: isNarrow ? 44 : 55,
            outline: isNarrow ? 24 : 20,
          }
        : {
            browser: isNarrow ? 38 : 28,
            content: isNarrow ? 62 : 72,
          }}
      id="filebucket-vault-panes"
      orientation={isNarrow ? "vertical" : "horizontal"}
      className="min-h-0 flex-1"
    >
      <Panel
        className="min-h-0 min-w-0"
        defaultSize={isNarrow ? "38%" : hasOutline ? "25%" : "28%"}
        id="browser"
        minSize={isNarrow ? "240px" : "280px"}
        maxSize={isNarrow ? "55%" : "420px"}
      >
        {browser}
      </Panel>
      <ResizeHandle isNarrow={isNarrow} />
      <Panel
        className="min-h-0 min-w-0"
        defaultSize={isNarrow ? "62%" : hasOutline ? "55%" : "72%"}
        id="content"
        minSize={isNarrow ? "360px" : "420px"}
      >
        {content}
      </Panel>
      {outline ? (
        <>
          <ResizeHandle isNarrow={isNarrow} />
          <Panel
            className="min-h-0 min-w-0"
            defaultSize={isNarrow ? "24%" : "20%"}
            id="outline"
            minSize={isNarrow ? "200px" : "220px"}
            maxSize={isNarrow ? "36%" : "340px"}
          >
            {outline}
          </Panel>
        </>
      ) : null}
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

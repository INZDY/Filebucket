"use client";

import { Fragment, type ReactNode, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, PanelLeft, X } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ResizableVaultProps = {
  browser: ReactNode;
  content: ReactNode;
  outline?: ReactNode;
};

export function ResizableVault({ browser, content, outline }: ResizableVaultProps) {
  const [isNarrow, setIsNarrow] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const hasOutline = Boolean(outline);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsNarrow(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isNarrow) {
      setIsBrowserOpen(false);
    }
  }, [isNarrow]);

  if (isNarrow) {
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#111318]">
        <div className="min-h-0 h-full">{content}</div>
        <Button
          aria-label="Open vault browser"
          className="fixed left-3 top-20 z-40 border-slate-700 bg-[#191c22]/95 text-slate-100 shadow-lg hover:bg-[#242832]"
          onClick={() => setIsBrowserOpen(true)}
          size="icon"
          type="button"
          variant="outline"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        {isBrowserOpen ? (
          <div className="fixed inset-0 z-50 bg-black/55" onClick={() => setIsBrowserOpen(false)}>
            <div
              className="h-full w-[min(360px,88vw)] border-r border-slate-800 bg-[#171a20] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-12 items-center justify-end border-b border-slate-800 px-3">
                <Button
                  aria-label="Close vault browser"
                  className="text-slate-300 hover:bg-slate-800 hover:text-slate-50"
                  onClick={() => setIsBrowserOpen(false)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-3rem)] min-h-0">{browser}</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

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
      orientation="horizontal"
      className="relative min-h-0 flex-1 bg-[#111318]"
    >
      <Panel
        key="browser-panel"
        className="min-h-0 min-w-0"
        defaultSize={hasOutline ? "25%" : "28%"}
        id="browser"
        minSize="280px"
        maxSize="420px"
      >
        {browser}
      </Panel>
      <ResizeHandle key="browser-content-resize" />
      <Panel
        key="content-panel"
        className="min-h-0 min-w-0"
        defaultSize={hasOutline ? "55%" : "72%"}
        id="content"
        minSize="420px"
      >
        {content}
      </Panel>
      {outline && !isOutlineOpen ? (
        <Button
          key="show-outline-button"
          aria-label="Show note outline"
          className="absolute right-3 top-3 z-30 border-slate-700 bg-[#191c22]/95 text-slate-200 shadow-lg hover:bg-slate-800"
          onClick={() => setIsOutlineOpen(true)}
          size="icon"
          type="button"
          variant="outline"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : null}
      {outline && isOutlineOpen ? (
        <Fragment key="outline-pane-group">
          <ResizeHandle key="content-outline-resize" />
          <Panel
            key="outline-panel"
            className="relative min-h-0 min-w-0"
            defaultSize="20%"
            id="outline"
            minSize="220px"
            maxSize="340px"
          >
            <div className="relative h-full min-h-0" key="outline-panel-content">
              <Button
                aria-label="Hide note outline"
                className="absolute right-2 top-2 z-10 h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-50"
                onClick={() => setIsOutlineOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {outline}
            </div>
          </Panel>
        </Fragment>
      ) : null}
    </Group>
  );
}

function ResizeHandle() {
  return (
    <Separator
      className="group relative w-px bg-slate-800 transition-colors hover:bg-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
          "bg-slate-600 transition-colors group-hover:bg-teal-400",
        )}
      />
    </Separator>
  );
}

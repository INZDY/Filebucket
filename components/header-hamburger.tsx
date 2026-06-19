"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeaderHamburger() {
  return (
    <Button
      aria-label="Open sidebar"
      variant="ghost"
      size="icon"
      className="md:hidden text-slate-300 hover:bg-slate-800 hover:text-slate-50 shrink-0"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("open-sidebar"));
      }}
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

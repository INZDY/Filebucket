"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportButtonProps = {
  email: string;
};

export function ExportButton({ email }: ExportButtonProps) {
  function handleExport(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!confirm("Are you sure you want to export your vault?")) {
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="hidden min-w-0 rounded-md border border-slate-700 bg-[#1b1f27] px-3 py-1.5 text-sm text-slate-400 md:block">
        <span className="block max-w-[220px] truncate">{email}</span>
      </div>
      <Button
        variant="outline"
        className="w-full border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 sm:w-auto"
        asChild
      >
        <a href="/api/export" download onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Vault
        </a>
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput({
  defaultValue,
  disabled,
}: {
  defaultValue: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(defaultValue);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  function handleSearch(val: string) {
    setQuery(val);
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set("q", val);
    } else {
      params.delete("q");
    }
    const newUrl = `/?${params.toString()}`;
    window.history.pushState(null, "", newUrl);
    window.dispatchEvent(new CustomEvent("vault-navigate", { detail: { url: newUrl } }));
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        className="border-slate-850 bg-[#14141a]/60 pl-9 text-slate-100 placeholder:text-slate-550 focus-visible:ring-purple-500/50 glass-input"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search titles and folders"
        disabled={disabled}
      />
    </div>
  );
}

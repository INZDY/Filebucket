"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface GlobalLoaderProps {
  renderKey: number;
}

export function GlobalLoader({ renderKey }: GlobalLoaderProps) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Reset loading when navigation completes
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams, renderKey]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    function handleStart() {
      setLoading(true);
      // Safety timeout (8s) to clear the indicator if something hangs
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setLoading(false), 8000);
    }

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      const download = anchor.getAttribute("download");

      // Intercept only internal, non-API, same-tab links that do not download
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("/api") &&
        target !== "_blank" &&
        download === null
      ) {
        handleStart();
      }
    }

    function handleSubmit() {
      handleStart();
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
      clearTimeout(timeoutId);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 z-50 animate-pulse" />
  );
}

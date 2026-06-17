"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";

export function PwaRegistry() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}

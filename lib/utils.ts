import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMediaAssetUrl(r2Key: string) {
  return `/api/media?key=${encodeURIComponent(r2Key)}`;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  
  // If the unit is Bytes, force 0 decimals
  const dm = safeI === 0 ? 0 : decimals;
  return parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm)) + " " + sizes[safeI];
}

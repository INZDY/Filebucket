import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMediaAssetUrl(r2Key: string) {
  return `/api/media?key=${encodeURIComponent(r2Key)}`;
}

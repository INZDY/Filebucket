/**
 * Safely registers the Progressive Web App service worker on the client side.
 */
export async function registerServiceWorker(): Promise<void> {
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator
  ) {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }
}

/**
 * True when the app runs as an installed PWA (standalone display mode), where
 * edge swipes do not collide with the browser's back gesture.
 */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const standaloneDisplay = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneDisplay || iosStandalone;
}

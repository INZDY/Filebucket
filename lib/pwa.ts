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

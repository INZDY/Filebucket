import { describe, it, expect, vi } from "vitest";
import manifest from "@/app/manifest";
import { metadata, viewport } from "@/app/layout";
import { registerServiceWorker } from "@/lib/pwa";

describe("PWA Manifest", () => {
  it("should return the correct manifest metadata structure", () => {
    const result = manifest();
    expect(result).toBeDefined();
    expect(result.name).toBe("Filebucket");
    expect(result.short_name).toBe("Filebucket");
    expect(result.display).toBe("standalone");
    expect(result.icons).toBeDefined();
    expect(result.icons!.length).toBeGreaterThan(0);
  });
});

describe("Root Layout Metadata", () => {
  it("should have correct PWA meta tags configured", () => {
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: "default",
      title: "Filebucket",
    });
    expect(viewport).toBeDefined();
    expect(viewport.themeColor).toBe("#7c3aed");
  });
});

describe("Service Worker Registration Utility", () => {
  it("should attempt to register the service worker if supported", async () => {
    const mockRegister = vi.fn().mockResolvedValue({} as any);
    
    // Save original navigator
    const originalNavigator = global.navigator;
    
    Object.defineProperty(global, "navigator", {
      value: {
        serviceWorker: {
          register: mockRegister,
        },
      },
      writable: true,
      configurable: true,
    });

    await registerServiceWorker();

    expect(mockRegister).toHaveBeenCalledWith("/sw.js");
    
    // Restore original navigator
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("should not crash if serviceWorker is not supported", async () => {
    const originalNavigator = global.navigator;
    
    Object.defineProperty(global, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });

    await expect(registerServiceWorker()).resolves.not.toThrow();

    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });
});

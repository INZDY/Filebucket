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
    expect(viewport.themeColor).toBe("#111318");
  });

  it("should configure base body overscroll-behavior and dynamic viewport height in layout", () => {
    const fs = require("fs");
    const path = require("path");
    const cssPath = path.join(process.cwd(), "app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain("overscroll-behavior: none");

    const pagePath = path.join(process.cwd(), "app/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    expect(pageContent).toContain("h-[100dvh]");
    expect(pageContent).not.toContain("className=\"h-screen");
    expect(pageContent).not.toContain("className=\"flex h-screen");
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

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

  it("should configure base body overscroll-behavior and visible height in layout", () => {
    const fs = require("fs");
    const path = require("path");
    const cssPath = path.join(process.cwd(), "app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain("overscroll-behavior: none");

    const pagePath = path.join(process.cwd(), "app/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    expect(pageContent).toContain("h-full");
    expect(pageContent).not.toContain("h-[100dvh]");
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

describe("Brand Icons, Logo, and Colors", () => {
  it("should have a squircle background, simplified paths, and blue primary color in public/icon.svg", () => {
    const fs = require("fs");
    const path = require("path");
    const svgPath = path.join(process.cwd(), "public/icon.svg");
    const svgContent = fs.readFileSync(svgPath, "utf-8");

    // Must have a rounded background rect representing the squircle
    expect(svgContent).toMatch(/<rect[^>]*rx="1(10|20|28)"[^>]*fill=/);

    // Document peaking out must be removed (no document outline path)
    expect(svgContent).not.toContain("M 190 95 L 190 65");
    expect(svgContent).not.toContain("y1=\"65\" x2=\"270\"");

    // Primary branding stroke/fill colors should be blue accents, not purple
    expect(svgContent).toContain("#3b82f6"); // Tailwind blue-500
    expect(svgContent).not.toContain("#a855f7"); // Old purple
  });

  it("should replace the generic Cloud icon with /icon.svg in layout and login views", () => {
    const fs = require("fs");
    const path = require("path");

    // Login page check
    const loginPath = path.join(process.cwd(), "app/login/page.tsx");
    const loginContent = fs.readFileSync(loginPath, "utf-8");
    expect(loginContent).toContain("/icon.svg");
    expect(loginContent).not.toContain("<Cloud className=\"h-5 w-5\"");
    expect(loginContent).not.toContain("<Cloud className=\"h-5.5 w-5.5\"");

    // Main Page header check
    const mainPagePath = path.join(process.cwd(), "app/page.tsx");
    const mainPageContent = fs.readFileSync(mainPagePath, "utf-8");
    expect(mainPageContent).toContain("/icon.svg");
    expect(mainPageContent).not.toContain("<Cloud className=\"h-5 w-5\"");
  });

  it("should set global CSS primary/ring variables to blue in app/globals.css", () => {
    const fs = require("fs");
    const path = require("path");
    const cssPath = path.join(process.cwd(), "app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // HSL representation of blue (e.g. 221.2 83.2% 53.3% -> ~221 or similar)
    expect(cssContent).toContain("--primary: 221");
  });
});

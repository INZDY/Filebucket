import type { Metadata } from "next";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import "./globals.css";
import { PwaRegistry } from "@/components/pwa-registry";

export const metadata: Metadata = {
  title: "Filebucket",
  description: "Private file and note vault",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Filebucket",
  },
};

export const viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PwaRegistry />
        {children}
      </body>
    </html>
  );
}

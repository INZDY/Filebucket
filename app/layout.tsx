import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Filebucket",
  description: "Private file and note vault"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

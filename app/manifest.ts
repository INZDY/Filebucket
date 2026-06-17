import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Filebucket",
    short_name: "Filebucket",
    description: "Your personal, quiet markdown and media vault.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d11",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any maskable",
      },
    ],
  };
}

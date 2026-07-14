import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sprout — Daycare Management",
    short_name: "Sprout",
    description: "Daily logs, attendance, classrooms, and billing for your daycare.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8f6",
    theme_color: "#2a5c4c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MORE Energy ERP",
    short_name: "MORE ERP",
    description: "نظام إدارة مور لأعمال الطاقة",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fbff",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/more-power-more-energy.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { getMessages } from "@/lib/i18n";
import { THEME_COLOR } from "@/lib/theme";

// Telefonda "Ana ekrana ekle" ile gelen simge ve ad. Simgeler: app/icon.svg (gözlü a), public/icon-512.png (koyu zeminde gözlü a).
export default function manifest(): MetadataRoute.Manifest {
  const t = getMessages();
  return {
    name: brand.name,
    short_name: brand.name,
    description: t.site.description,
    start_url: "/",
    display: "browser",
    background_color: THEME_COLOR.dark,
    theme_color: THEME_COLOR.dark,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// On GitHub Pages the site is served under "https://user.github.io/repo-name/".
// The workflow (deploy.yml) passes the base path via VITE_BASE; locally "/" is used.
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    // Generates the manifest + service worker that enable Chrome's "Install app" option.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        id: base,
        name: "Görevler",
        short_name: "Görevler",
        description: "Tarihe göre gruplanan, Google Drive ile eşitlenebilen yapılacaklar listesi.",
        lang: "tr",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#eef2f4",
        theme_color: "#0e7c86",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});

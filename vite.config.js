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
      workbox: { globPatterns: ["**/*.{js,css,html,woff2,png,svg}"] },
      manifest: {
        id: base,
        name: "Görevler",
        short_name: "Görevler",
        description:
          "Tarihe göre gruplanan, Google ile giriş yapıp Supabase'e yedeklenebilen yapılacaklar listesi.",
        lang: "tr",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#0c1216",
        // Fallback only; the <meta name="theme-color"> tags in index.html follow light/dark mode
        theme_color: "#f6f7f8",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});

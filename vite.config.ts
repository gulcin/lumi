import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Project site: https://gulcin.github.io/lumi/
const pagesBase = "/lumi/";

export default defineConfig({
  base: pagesBase,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "favicon.svg", "icons/*.png", "data/*.json"],
      manifest: {
        name: "Lumi",
        short_name: "Lumi",
        description:
          "Adaptive lessons for a curious child, across the whole Marble curriculum.",
        theme_color: "#ef5d3c",
        background_color: "#fff1df",
        display: "standalone",
        start_url: pagesBase,
        scope: pagesBase,
        lang: "en",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,svg,png,jpg,webp,woff2,ico,webmanifest}"],
        globIgnores: ["**/splash/**", "**/art/lumi/sheet.webp"],
        cacheId: "lumi-art-1",
        navigateFallback: `${pagesBase}index.html`,
        navigateFallbackAllowlist: [/^\/lumi\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: { host: "0.0.0.0", port: 4179 },
  preview: { host: "0.0.0.0", port: 4179 },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

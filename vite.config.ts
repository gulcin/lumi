import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { serviceWorkerCacheId } from "./src/lib/version";

// Project site: https://gulcin.github.io/lumi/
const pagesBase = "/lumi/";
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

function gitValue(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const lumiVersion = process.env.LUMI_VERSION || pkg.version;
const lumiSha = process.env.LUMI_GIT_SHA || gitValue("git rev-parse --short=7 HEAD", "dev");
const lumiDate = process.env.LUMI_BUILD_DATE || gitValue("git log -1 --format=%cs", new Date().toISOString().slice(0, 10));
const versionJson = `${JSON.stringify({ version: lumiVersion, sha: lumiSha, date: lumiDate }, null, 2)}\n`;

function noCache(req: Connect.IncomingMessage, res: { setHeader: (name: string, value: string) => void }, next: () => void) {
  const path = req.url?.split("?")[0] ?? "";
  if (path.endsWith("/sw.js") || path.endsWith("/version.json")) {
    const setHeader = res.setHeader.bind(res);
    res.setHeader = (name: string, value: string) => {
      if (name.toLowerCase() === "cache-control") return setHeader(name, "no-cache");
      return setHeader(name, value);
    };
    res.setHeader("Cache-Control", "no-cache");
  }
  if (path.endsWith("/version.json") && !path.includes("/assets/")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
  }
  next();
}

function lumiVersionPlugin(): Plugin {
  return {
    name: "lumi-version",
    transformIndexHtml(html) {
      return html.replace("</head>", `    <meta name="lumi-version" content="${lumiVersion}" />\n  </head>`);
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: versionJson });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        if (path === "/lumi/version.json" || path === "/version.json") {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.end(versionJson);
          return;
        }
        noCache(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(noCache);
    },
  };
}

export default defineConfig({
  define: {
    __LUMI_VERSION__: JSON.stringify(lumiVersion),
    __LUMI_SHA__: JSON.stringify(lumiSha),
    __LUMI_DATE__: JSON.stringify(lumiDate),
  },
  base: pagesBase,
  plugins: [
    react(),
    lumiVersionPlugin(),
    VitePWA({
      registerType: "prompt",
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
        globIgnores: ["**/splash/**", "**/art/lumi/sheet.webp", "**/version.json"],
        clientsClaim: true,
        cacheId: serviceWorkerCacheId(lumiVersion),
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

import { execSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, sep } from "node:path";
import { chromium, devices } from "playwright";

const port = 4217;
const origin = `http://127.0.0.1:${port}`;
const shots = "/opt/cursor/artifacts/screenshots/update";
const v1 = "/tmp/lumi-v1";
const v2 = "/tmp/lumi-v2";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon",
};

function build(version, sha, outDir) {
  execSync(`npx vite build --outDir ${outDir}`, {
    stdio: "inherit",
    env: {
      ...process.env,
      LUMI_VERSION: version,
      LUMI_GIT_SHA: sha,
      LUMI_BUILD_DATE: "2026-10-18",
    },
  });
}

const state = { root: v1 };

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", origin);
      let path = decodeURIComponent(url.pathname);
      if (path === "/lumi") path = "/lumi/";
      if (path.startsWith("/lumi/")) path = path.slice("/lumi".length);
      if (path.endsWith("/")) path += "index.html";
      const file = join(state.root, path);
      const rootPrefix = state.root.endsWith(sep) ? state.root : state.root + sep;
      if (!file.startsWith(rootPrefix) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404, { "Cache-Control": "no-cache" });
        res.end("missing");
        return;
      }
      const headers = { "Content-Type": types[extname(file)] || "application/octet-stream" };
      if (path.endsWith("/sw.js") || path.endsWith("/version.json")) headers["Cache-Control"] = "no-cache";
      res.writeHead(200, headers);
      createReadStream(file).pipe(res);
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function progress(extra = {}) {
  return {
    version: 1,
    childName: "Aida",
    childKey: "child_update_test_aida",
    named: true,
    speechOn: false,
    soundOn: false,
    stars: 1,
    startGrade: 3,
    topics: {},
    sessions: [],
    createdAt: 1,
    deviceUpdatedAt: 1,
    badges: {},
    badgeLog: [],
    interests: [],
    acornEvents: [],
    owned: [],
    wearing: {},
    ...extra,
  };
}

function standaloneScript(doc) {
  const raw = JSON.stringify(doc);
  return `(() => {
    const saved = ${raw};
    localStorage.setItem("lumi.progress.v1", JSON.stringify(saved));
    localStorage.setItem("lumi.seenVersion", "1.0.0");
    localStorage.removeItem("lumi.updateDeferred");
    const media = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }
      : media(query);
  })();`;
}

async function waitForVersion(page, version) {
  const deadline = Date.now() + 30000;
  let last = "";
  while (Date.now() < deadline) {
    try {
      last = (await page.locator('meta[name="lumi-version"]').getAttribute("content", { timeout: 2000 })) ?? "";
      if (last === version) return;
    } catch {
      // A reload destroys the page context while the new document starts.
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`version stayed ${last || "missing"}`);
}

async function openApp(context, doc) {
  const page = await context.newPage();
  await page.addInitScript(standaloneScript(doc));
  await page.goto(`${origin}/lumi/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.updates === "1");
  await page.getByRole("heading", { name: "Hi, Aida." }).waitFor();
  return page;
}

build("1.0.0", "aaaa111", v1);
build("1.1.0", "bbbb222", v2);

const sw = readFileSync(join(v2, "sw.js"), "utf8");
if (!sw.includes("SKIP_WAITING")) throw new Error("prompt worker is missing SKIP_WAITING");
if (!sw.includes('prefix:"lumi-v1.1.0"') && !sw.includes('prefix: "lumi-v1.1.0"')) {
  throw new Error("service worker cache is not lumi-v1.1.0");
}
if (sw.includes("version.json")) throw new Error("version.json was precached");
const versionFile = JSON.parse(readFileSync(join(v1, "version.json"), "utf8"));
if (versionFile.version !== "1.0.0") throw new Error(`v1 version.json is ${versionFile.version}`);

const server = await startServer();
const headerCheck = await fetch(`${origin}/lumi/sw.js`);
const versionHeaders = await fetch(`${origin}/lumi/version.json`);
if (!headerCheck.headers.get("cache-control")?.includes("no-cache")) throw new Error("sw.js is cacheable");
if (!versionHeaders.headers.get("cache-control")?.includes("no-cache")) throw new Error("version.json is cacheable");
if ((await versionHeaders.json()).version !== "1.0.0") throw new Error("served the wrong version.json");

await mkdir(shots, { recursive: true });
const browser = await chromium.launch();
const ipad = devices["iPad Pro 11"];

try {
  const context = await browser.newContext({ ...ipad, reducedMotion: "reduce", serviceWorkers: "allow" });
  const page = await openApp(context, progress());
  const running = await page.locator('meta[name="lumi-version"]').getAttribute("content");
  if (running !== "1.0.0") throw new Error(`opened ${running}`);

  await page.getByTestId("home-grownups").click();
  await page.locator(".gate-sum input").fill("27");
  await page.locator(".gate-sum button").click();
  await page.getByTestId("app-version").waitFor();
  const stamp = await page.getByTestId("app-version").innerText();
  if (!stamp.startsWith("v1.0.0")) throw new Error(`stamp ${stamp}`);
  await page.getByTestId("check-updates").click();
  await page.getByTestId("update-status").waitFor();
  const status = await page.getByTestId("update-status").innerText();
  if (status !== "Lumi is up to date.") throw new Error(`status ${status}`);
  await page.screenshot({ path: `${shots}/grownups-portrait.png` });
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("heading", { name: "Hi, Aida." }).waitFor();

  state.root = v2;
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.getByTestId("update-banner").waitFor({ timeout: 30000 });
  const banner = await page.getByTestId("update-banner").innerText();
  if (!banner.includes("Lumi learned something new!")) throw new Error(banner);
  if (!banner.includes("Update")) throw new Error(banner);
  await page.screenshot({ path: `${shots}/banner-portrait.png` });
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.screenshot({ path: `${shots}/banner-landscape.png` });
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.getByTestId("update-apply").click();
  await waitForVersion(page, "1.1.0");
  const kept = await page.evaluate(() => ({
    keys: Object.keys(localStorage),
    progress: JSON.parse(localStorage.getItem("lumi.progress.v1") ?? "null"),
  }));
  if (!kept.keys.includes("lumi.progress.v1")) throw new Error(`keys ${kept.keys.join(",")}`);
  if (kept.keys.some((key) => key.startsWith("lumi.progress.") && key !== "lumi.progress.v1")) {
    throw new Error(`progress key changed: ${kept.keys.join(",")}`);
  }
  if (kept.progress?.childName !== "Aida") throw new Error("progress was not kept");
  await context.close();

  state.root = v1;
  const tax = JSON.parse(readFileSync(join(v1, "data/taxonomy.json"), "utf8"));
  const topic = tax.topics.find((item) => item.subject === "Mathematics") ?? tax.topics[0];
  const lesson = await browser.newContext({ ...ipad, reducedMotion: "reduce", serviceWorkers: "allow" });
  const during = await openApp(
    lesson,
    progress({
      active: {
        id: "lesson-in-progress",
        mode: "topic",
        topicId: topic.id,
        startedAt: 1,
        items: [{ topicId: topic.id, role: "practice", seed: 7 }],
        index: 0,
        correct: 0,
        stars: 0,
        newlyMastered: [],
      },
    }),
  );
  await during.getByTestId("home-play").click();
  await during.getByTestId("inquiry-continue").waitFor();
  state.root = v2;
  await during.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await during.waitForFunction(() => localStorage.getItem("lumi.updateDeferred") === "1", null, { timeout: 30000 });
  if ((await during.getByTestId("update-banner").count()) !== 0) throw new Error("banner showed during a lesson");
  await during.screenshot({ path: `${shots}/lesson-deferred-portrait.png` });
  await during.close();
  const next = await lesson.newPage();
  await next.goto(`${origin}/lumi/`, { waitUntil: "domcontentloaded" });
  await waitForVersion(next, "1.1.0");
  const after = await next.evaluate(() => JSON.parse(localStorage.getItem("lumi.progress.v1") ?? "null"));
  if (after?.childName !== "Aida" || after?.active?.id !== "lesson-in-progress") {
    throw new Error(`next launch lost the lesson: ${JSON.stringify(after)?.slice(0, 200)}`);
  }
  if (!Object.keys(await next.evaluate(() => localStorage)).includes("lumi.progress.v1")) {
    throw new Error("progress key missing after the next launch");
  }
  await lesson.close();
  console.log("two-version update ok");
} finally {
  await browser.close();
  server.close();
}

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium, devices } from "playwright";

const port = 4221;
const origin = `http://127.0.0.1:${port}/lumi/?e2e=1`;
const shots = process.env.LUMI_SHOTS ?? "/opt/cursor/artifacts/screenshots/type";

function view(name, width, height) {
  return {
    name,
    device: {
      viewport: { width, height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: devices["iPhone 13"].userAgent,
    },
  };
}

const views = [
  view("iphone", 390, 844),
  view("ipad-11-portrait", 834, 1194),
  view("ipad-11-landscape", 1194, 834),
  view("ipad-13-portrait", 1024, 1366),
  view("ipad-13-landscape", 1366, 1024),
];

function startPreview() {
  return spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    stdio: "inherit",
    detached: true,
  });
}

async function waitForServer(child) {
  const deadline = Date.now() + 20000;
  let exited = false;
  child.on("exit", () => {
    exited = true;
  });
  while (Date.now() < deadline) {
    if (exited) throw new Error("preview exited before it was ready");
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // preview is still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("preview did not start");
}

async function measure(page) {
  return page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const heading = document.querySelector("h1");
    const button = document.querySelector("button");
    const px = (value) => Number.parseFloat(value);
    return {
      html: px(html.fontSize),
      body: px(body.fontSize),
      h1: heading ? px(getComputedStyle(heading).fontSize) : 0,
      button: button ? px(getComputedStyle(button).fontSize) : 0,
      adjust: (html.getPropertyValue("-webkit-text-size-adjust") || html.getPropertyValue("text-size-adjust")).trim(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

const preview = startPreview();
try {
  await waitForServer(preview);
  await mkdir(shots, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const view of views) {
      const context = await browser.newContext({ ...view.device, reducedMotion: "reduce", serviceWorkers: "allow" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      await page.addInitScript(() => {
        localStorage.setItem(
          "lumi.progress.v1",
          JSON.stringify({
            version: 1,
            childName: "Aida",
            childKey: "child_type_aida",
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
          }),
        );
        localStorage.setItem("lumi.seenVersion", "1.1.2");
      });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Hi, Aida." }).waitFor();
      const metrics = await measure(page);
      if (errors.length) throw new Error(`${view.name} console: ${errors.join(" | ")}`);
      if (metrics.html !== 16) throw new Error(`${view.name} html font ${metrics.html}`);
      if (metrics.body < 17 || metrics.body > 20) throw new Error(`${view.name} body font ${metrics.body}`);
      if (metrics.h1 < 26 || metrics.h1 > 42) throw new Error(`${view.name} h1 ${metrics.h1}`);
      if (metrics.button < 15 || metrics.button > 28) throw new Error(`${view.name} button ${metrics.button}`);
      if (!metrics.adjust.includes("100%")) throw new Error(`${view.name} text-size-adjust ${metrics.adjust}`);
      if (metrics.overflow > 1) throw new Error(`${view.name} horizontal overflow ${metrics.overflow}`);
      await page.screenshot({ path: `${shots}/after-${view.name}.png` });
      console.log(view.name, metrics);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log("type scale ok");
} finally {
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    preview.kill("SIGTERM");
  }
}

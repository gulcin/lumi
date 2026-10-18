import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium, devices } from "playwright";

const port = 4223;
const origin = `http://127.0.0.1:${port}/lumi/?e2e=1`;
const shots = process.env.LUMI_SHOTS ?? "/opt/cursor/artifacts/screenshots/tell";

function view(name, width, height) {
  return {
    name,
    width,
    height,
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

function progress(extra = {}) {
  return {
    version: 1,
    childName: "Aida",
    childKey: "child_screen_aida",
    named: true,
    speechOn: false,
    soundOn: false,
    stars: 1,
    startGrade: 3,
    placement: { level: "growing", bandStart: 6, bandEnd: 7, assumedThroughAge: 5, correct: 4, total: 8, at: 1, startGrade: 3 },
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

async function tap(locator) {
  const handle = await locator.elementHandle();
  if (!handle) throw new Error("Missing control");
  await handle.evaluate((el) => el.click());
  await handle.dispose();
}

async function answer(page) {
  const inquiry = page.getByTestId("inquiry-continue");
  if (await inquiry.count()) await tap(inquiry);
  const exercise = page.getByTestId("exercise");
  await exercise.waitFor({ timeout: 15000 });
  const kind = await exercise.getAttribute("data-kind");
  const token = (await exercise.getAttribute("data-answer")) ?? "";
  if (kind === "number") {
    for (const ch of token) {
      if (ch === "-") await tap(page.getByTestId("key-neg"));
      else if (ch === ".") await tap(page.getByTestId("key-dot"));
      else await tap(page.getByTestId(`key-${ch}`));
    }
    await tap(page.getByTestId("key-ok"));
  } else if (kind === "choice") {
    await tap(page.locator(`[data-choice-id="${token}"]`));
  } else if (kind === "order") {
    for (const id of token.split("|")) await tap(page.locator(`[data-order-id="${id}"]`));
    await tap(page.getByTestId("order-done"));
  } else {
    await tap(page.getByTestId("talk-yes"));
  }
  const reflect = page.getByRole("button", { name: "What did you find out?" });
  if (await reflect.count()) {
    await tap(reflect);
    await tap(page.getByRole("button", { name: "I found out something new" }));
    return;
  }
  await tap(page.getByTestId("next"));
}

async function finishLesson(page) {
  for (let guard = 0; guard < 24; guard += 1) {
    if (await page.getByTestId("celebration").count()) return;
    if ((await page.getByTestId("exercise").count()) || (await page.getByTestId("inquiry-continue").count())) {
      await answer(page);
      continue;
    }
    if (await page.getByTestId("next").count()) {
      await tap(page.getByTestId("next"));
      continue;
    }
    await page.waitForTimeout(200);
  }
}

async function assertSane(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const metrics = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const heading = document.querySelector("h1");
    const tell = document.querySelector("[data-testid='tell-us']");
    const tellBox = tell?.getBoundingClientRect();
    return {
      html: Number.parseFloat(html.fontSize),
      body: Number.parseFloat(body.fontSize),
      h1: heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : 0,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tellTop: tellBox ? tellBox.top : -1,
      tellBottom: tellBox ? tellBox.bottom : -1,
      height: window.innerHeight,
    };
  });
  if (metrics.html !== 16) throw new Error(`${label} html font ${metrics.html}`);
  if (metrics.body < 17 || metrics.body > 20) throw new Error(`${label} body font ${metrics.body}`);
  if (metrics.h1 && (metrics.h1 < 26 || metrics.h1 > 42)) throw new Error(`${label} h1 ${metrics.h1}`);
  if (metrics.overflow > 1) throw new Error(`${label} horizontal overflow ${metrics.overflow}`);
  if (metrics.tellTop < 0 || metrics.tellBottom > metrics.height) throw new Error(`${label} Tell us is off screen`);
}

async function home(page) {
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Hi, Aida." }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
}

const preview = startPreview();
try {
  await waitForServer(preview);
  await mkdir(shots, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const view of views) {
      const context = await browser.newContext({ ...view.device, reducedMotion: "reduce", serviceWorkers: "block" });
      const page = await context.newPage();
      const errors = [];
      const missing = [];
      page.on("pageerror", (error) => {
        const text = String(error);
        if (text.includes("reading 'waiting'")) return;
        errors.push(text);
      });
      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        if (text.includes("reading 'waiting'")) return;
        errors.push(text);
      });
      page.on("response", (response) => {
        const url = response.url();
        if (response.status() !== 404) return;
        if (!url.startsWith(origin.slice(0, origin.indexOf("/lumi")))) return;
        if (new URL(url).pathname === "/favicon.ico") return;
        missing.push(url);
      });
      page.setDefaultTimeout(20000);
      await page.addInitScript((saved) => {
        localStorage.setItem("lumi.progress.v1", JSON.stringify(saved));
        localStorage.setItem("lumi.seenVersion", "1.2.0");
      }, progress());
      await home(page);
      await assertSane(page, `${view.name} home`);
      if (view.name === "iphone" || view.name === "ipad-11-portrait") {
        await page.screenshot({ path: `${shots}/button-${view.name}.png` });
      }

      await page.getByTestId("tell-us").click();
      await page.getByTestId("tell-card").waitFor();
      await page.getByTestId("tell-bug").click();
      const fit = await page.getByTestId("tell-card").evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return {
          fits: el.scrollHeight <= el.clientHeight + 2 && rect.top >= -1 && rect.bottom <= window.innerHeight + 1,
          scroll: el.scrollHeight,
          client: el.clientHeight,
          top: rect.top,
          bottom: rect.bottom,
          height: window.innerHeight,
        };
      });
      if (!fit.fits) throw new Error(`${view.name} tell form does not fit ${JSON.stringify(fit)}`);
      if (view.name === "iphone" || view.name === "ipad-11-portrait" || view.name === "ipad-11-landscape") {
        await page.screenshot({ path: `${shots}/form-${view.name}.png` });
      }
      await page.getByTestId("tell-note").fill("The fox button works.");
      await page.getByTestId("tell-submit").click();
      await page.getByRole("heading", { name: "Lumi heard you." }).waitFor();
      const mum = page.getByTestId("send-mum");
      const sent = page.getByTestId("tell-sent");
      await mum.or(sent).waitFor();
      if (await mum.count()) {
        const href = (await mum.getAttribute("href")) ?? "";
        if (!href.startsWith("mailto:gulcin.yildirim@clickhouse.com?")) throw new Error(`${view.name} mailto ${href.slice(0, 80)}`);
        if (href.length > 1800) throw new Error(`${view.name} mailto length ${href.length}`);
        if (!decodeURIComponent(href).includes("Lumi report –")) throw new Error(`${view.name} mailto subject`);
      }
      if (view.name === "iphone") await page.screenshot({ path: `${shots}/done-iphone.png` });
      await page.getByTestId("tell-done").click();

      await page.getByRole("button", { name: /Who we are/ }).click();
      await page.locator(".topbar strong", { hasText: "Who we are" }).waitFor();
      await assertSane(page, `${view.name} theme`);
      await page.getByRole("button", { name: "Back" }).click();
      await page.getByRole("heading", { name: "Hi, Aida." }).waitFor();

      await page.getByRole("button", { name: "What I love" }).click();
      await page.getByRole("heading", { name: "What do you love?" }).waitFor();
      await assertSane(page, `${view.name} interests`);
      await page.getByRole("button", { name: "Back" }).click();

      await page.getByRole("button", { name: "Acorn shop" }).click();
      await page.getByTestId("acorn-shop").waitFor();
      await assertSane(page, `${view.name} shop`);
      await page.getByRole("button", { name: "Back" }).click();

      await page.getByRole("button", { name: "Show what I made" }).click();
      await page.getByTestId("journal").waitFor();
      await assertSane(page, `${view.name} journal`);
      await page.getByRole("button", { name: "Back" }).click();

      await page.getByTestId("home-explore").click();
      await page.locator(".topbar strong", { hasText: "Explore" }).waitFor();
      await page.getByRole("button", { name: /Mathematics/ }).first().click();
      await page.locator(".topic-row").first().click();
      await page.getByRole("heading", { level: 1 }).waitFor();
      await assertSane(page, `${view.name} peek`);
      await page.getByRole("button", { name: "Back" }).click();
      await page.getByRole("button", { name: "Back" }).click();
      await page.getByRole("heading", { name: "Hi, Aida." }).waitFor();

      await page.getByTestId("home-grownups").click();
      await page.locator(".gate-sum input").fill("27");
      await page.locator(".gate-sum button").click();
      await page.getByTestId("parent-root").waitFor();
      await assertSane(page, `${view.name} grownups`);
      await page.getByRole("tab", { name: "Reports" }).click();
      await page.getByRole("heading", { name: "Notes for us" }).waitFor();
      await page.getByText("The fox button works.").waitFor();
      await page.getByRole("button", { name: "Back" }).click();

      if (view.name === "iphone") {
        await page.getByTestId("home-play").click();
        await page.getByTestId("inquiry-continue").or(page.getByTestId("exercise")).waitFor();
        await assertSane(page, `${view.name} session`);
        await page.screenshot({ path: `${shots}/session-${view.name}.png` });
        await page.getByRole("button", { name: "Back" }).click();
        await page.getByRole("heading", { name: "Hi, Aida." }).waitFor();
      }

      if (view.name === "ipad-11-portrait") {
        await page.getByTestId("home-play").click();
        await finishLesson(page);
        await page.getByTestId("celebration").waitFor();
        await assertSane(page, `${view.name} celebration`);
        await page.getByRole("button", { name: "Home" }).click();
        await page.getByRole("heading", { name: "Hi, Aida." }).waitFor();

        await page.evaluate(() => {
          const raw = JSON.parse(localStorage.getItem("lumi.progress.v1") || "{}");
          delete raw.placement;
          delete raw.active;
          localStorage.setItem("lumi.progress.v1", JSON.stringify(raw));
          localStorage.setItem("lumi.e2ePlacement", "off");
        });
        await page.addInitScript(() => {
          if (localStorage.getItem("lumi.e2ePlacement") !== "off") return;
          const raw = JSON.parse(localStorage.getItem("lumi.progress.v1") || "{}");
          delete raw.placement;
          delete raw.active;
          localStorage.setItem("lumi.progress.v1", JSON.stringify(raw));
        });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.getByTestId("home-warmup").click();
        for (let i = 0; i < 8; i += 1) await answer(page);
        await page.getByRole("heading", { name: "I know where to start." }).waitFor();
        await assertSane(page, `${view.name} ready`);
      }

      if (errors.length) throw new Error(`${view.name} console: ${errors.join(" | ")}`);
      if (missing.length) throw new Error(`${view.name} 404: ${missing.join(" | ")}`);
      console.log(view.name, "screens ok");
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log("screen sanity ok");
} finally {
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    preview.kill("SIGTERM");
  }
}

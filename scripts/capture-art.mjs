import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.LUMI_URL ?? "http://127.0.0.1:4180/lumi/?e2e=1";
const outDir = process.env.LUMI_SHOTS ?? "/opt/cursor/artifacts/screenshots/art";
const FAMILY = "amber-river-cedar-maple-a1b2c3d4";
const ipad = devices["iPad Pro 11"];

async function shot(page, name) {
  await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(150);
  await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
    window.scrollTo(0, 0);
  });
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.screenshot({ path: `${outDir}/${name}-portrait.png`, fullPage: true });
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.screenshot({ path: `${outDir}/${name}-landscape.png`, fullPage: true });
  await page.setViewportSize({ width: 834, height: 1194 });
}

async function answer(page) {
  const inquiry = page.getByTestId("inquiry-continue");
  if (await inquiry.count()) await inquiry.click();
  const exercise = page.getByTestId("exercise");
  await exercise.waitFor({ timeout: 15000 });
  const kind = await exercise.getAttribute("data-kind");
  const token = (await exercise.getAttribute("data-answer")) ?? "";
  if (kind === "number") {
    for (const ch of token) {
      if (ch === "-") await page.getByTestId("key-neg").click();
      else if (ch === ".") await page.getByTestId("key-dot").click();
      else await page.getByTestId(`key-${ch}`).click();
    }
    await page.getByTestId("key-ok").click();
  } else if (kind === "choice") {
    await page.locator(`[data-choice-id="${token}"]`).click();
  } else if (kind === "order") {
    for (const id of token.split("|")) await page.locator(`[data-order-id="${id}"]`).click();
    await page.getByTestId("order-done").click();
  } else {
    await page.getByTestId("talk-yes").click();
  }
  if (await page.getByTestId("reflect").count()) return "reflect";
  const next = page.getByTestId("next");
  if (await next.count()) await next.click();
  return "next";
}

async function dress(page, wearing) {
  await page.evaluate((outfit) => {
    const raw = localStorage.getItem("lumi.progress.v1");
    if (!raw) return;
    const progress = JSON.parse(raw);
    progress.acornEvents = [...(progress.acornEvents ?? []), { id: "art-seed", at: Date.now(), delta: 40, reason: "seed" }];
    progress.owned = ["hat-cap", "hat-leaf", "hat-star", "scarf-teal", "scarf-gold", "glasses-round", "glasses-star", "den-stars", "den-leaves"];
    progress.wearing = outfit;
    localStorage.setItem("lumi.progress.v1", JSON.stringify(progress));
  }, wearing);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Acorn shop" }).click();
  await page.getByTestId("acorn-shop").waitFor();
}

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });

const context = await browser.newContext({ ...ipad, serviceWorkers: "block" });
const page = await context.newPage();
page.setDefaultTimeout(20000);
await page.route("**/v1/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  const method = route.request().method();
  if (path.endsWith("/v1/families") && method === "POST") return route.fulfill({ json: { code: FAMILY } });
  if (path.endsWith("/v1/family")) return route.fulfill({ json: { children: [] } });
  if (path.endsWith("/v1/progress") && method === "POST") {
    const body = route.request().postDataJSON();
    return route.fulfill({ json: { progress: body.progress } });
  }
  if (path.endsWith("/v1/chat") && method === "POST") {
    return route.fulfill({ json: { reply: "People painted the animals they knew. Which animal would you paint?" } });
  }
  if (path.endsWith("/v1/chat")) {
    return route.fulfill({ json: { messages: [] } });
  }
  return route.fulfill({ status: 404, json: { error: "missing" } });
});

await page.goto(base, { waitUntil: "networkidle" });
await page.getByPlaceholder("Your name").waitFor();
await shot(page, "01-name");
await page.getByPlaceholder("Your name").fill("Aida");
await page.getByRole("button", { name: "That's me" }).click();
await page.getByTestId("theme-home").waitFor();
await shot(page, "02-home");

await page.getByRole("button", { name: "What I love" }).click();
await page.getByTestId("interests").waitFor();
await page.getByRole("button", { name: /Animals/ }).click();
await shot(page, "03-interests");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByRole("button", { name: /Where we are in place and time/ }).click();
await page.getByText("Lumi's working on").first().waitFor();
await shot(page, "04-theme-path");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByTestId("home-explore").click();
await page.getByRole("button", { name: /^History/ }).waitFor();
await shot(page, "05-skill-map");
await page.getByPlaceholder("Search all lessons").fill("Cave Paintings");
await page.getByRole("button", { name: /Cave Paintings/ }).click();
await page.getByTestId("start-topic").click();
await page.getByTestId("inquiry").waitFor();
await shot(page, "06-inquiry");
await page.getByTestId("inquiry-continue").click();
await page.getByTestId("exercise").waitFor();
await shot(page, "07-practice");

await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("lumi.progress.v1"));
  const id = progress.active?.topicId ?? progress.active?.items?.[0]?.topicId;
  if (!id) return;
  const old = Date.now() - 86_400_000;
  progress.topics[id] = {
    attempts: [1, 2, 3].map((i) => ({ at: old + i, sessionId: "older-session", correct: true, role: "practice" })),
    mastered: false,
    reviewStage: 0,
    lapses: 0,
    attemptFloor: 0,
  };
  localStorage.setItem("lumi.progress.v1", JSON.stringify(progress));
});
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "Continue the lesson" }).click();
if (await page.getByTestId("inquiry-continue").count()) await page.getByTestId("inquiry-continue").click();
await page.getByTestId("exercise").waitFor();
await answer(page);
if (await page.getByRole("button", { name: "What did you find out?" }).count()) {
  await page.getByRole("button", { name: "What did you find out?" }).click();
}
if (await page.getByTestId("reflect").count()) {
  await shot(page, "08-reflect");
  await page.getByRole("button", { name: "I found out something new" }).click();
} else {
  console.log("WARN no reflect screen");
}

let sawReflect = true;
for (let guard = 0; guard < 12; guard += 1) {
  if (await page.getByTestId("celebration").count()) break;
  if (await page.getByTestId("reflect").count()) {
    await page.getByRole("button", { name: "I found out something new" }).click();
    continue;
  }
  if (await page.getByTestId("exercise").count() || (await page.getByTestId("inquiry-continue").count())) {
    await answer(page);
    continue;
  }
  if (await page.getByRole("button", { name: "What did you find out?" }).count()) {
    await page.getByRole("button", { name: "What did you find out?" }).click();
    continue;
  }
  await page.waitForTimeout(200);
}
await page.getByTestId("celebration").waitFor();
await shot(page, "09-celebration");
if (!sawReflect) console.log("WARN no reflect screen");

await page.getByRole("button", { name: "Home" }).click();
await page.getByTestId("learner-badges").waitFor();
await shot(page, "10-badges-home");

await page.getByRole("button", { name: "Acorn shop" }).click();
await page.getByTestId("acorn-shop").waitFor();
await shot(page, "11-shop");
await dress(page, { hat: "hat-cap", scarf: "scarf-teal", glasses: "glasses-round" });
await page.getByTestId("acorn-shop").waitFor();
await shot(page, "12-dress-cap");
await dress(page, { hat: "hat-leaf", scarf: "scarf-gold", glasses: "glasses-star" });
await page.getByTestId("acorn-shop").waitFor();
await shot(page, "13-dress-leaf");
await dress(page, { hat: "hat-star" });
await page.getByTestId("acorn-shop").waitFor();
await shot(page, "14-dress-star");
await dress(page, { den: "den-stars", hat: "hat-cap" });
await page.getByTestId("acorn-shop").waitFor();
await shot(page, "15-den-stars");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByRole("button", { name: "Show what I made" }).click();
await page.getByTestId("journal").waitFor();
await shot(page, "16-journal-empty");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
await writeFile("/tmp/lumi-journal.png", png);
await page.getByLabel("A few words").fill("A cave painting");
await page.getByTestId("journal-file").setInputFiles("/tmp/lumi-journal.png");
await page.getByTestId("journal-cheer").waitFor();
await shot(page, "17-journal-cheer");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByTestId("home-grownups").click();
await page.getByTestId("gate-hold").waitFor();
await shot(page, "18-gate");
await page.getByLabel("Or what is 19 + 8?").fill("27");
await page.getByRole("button", { name: "Open" }).click();
await page.getByTestId("parent-root").waitFor();
await shot(page, "19-grownups");
await page.getByRole("tab", { name: "PYP themes" }).click();
await page.getByTestId("parent-themes").waitFor();
await shot(page, "20-parent-themes");
await page.getByRole("tab", { name: "Today" }).click();
await page.getByTestId("daily-note").waitFor();
await shot(page, "21-daily-note");
await page.getByRole("tab", { name: "Backup" }).click();
await page.getByRole("button", { name: "Create a family sync code" }).click();
await page.getByTestId("family-code").waitFor();
await shot(page, "22-sync");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByTestId("home-chat").click();
await page.getByTestId("voice-chat").waitFor();
await shot(page, "23-chat");
await page.getByLabel("Or type").fill("Why did people paint in caves?");
await page.getByTestId("chat-send").click();
await page.getByTestId("chat-reply").waitFor();
await shot(page, "24-chat-reply");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByTestId("home-play").click();
await page.getByTestId("gate-hold").waitFor();
await page.getByLabel("Or what is 19 + 8?").fill("27");
await page.getByRole("button", { name: "Open" }).click();
await page.getByTestId("grownup-placement").waitFor();
await shot(page, "25-grownup-placement");
await page.getByRole("button", { name: "Back", exact: true }).click();
await page.getByRole("button", { name: "Back", exact: true }).click();

if (await page.getByTestId("home-warmup").count()) {
  await page.getByTestId("home-warmup").click();
  await page.getByTestId("exercise").waitFor();
  await shot(page, "26-warmup");
  await page.getByRole("button", { name: "Back", exact: true }).click();
}

await page.getByTestId("home-play").click();
await page.getByTestId("gate-hold").waitFor();
await page.getByLabel("Or what is 19 + 8?").fill("27");
await page.getByRole("button", { name: "Open" }).click();
await page.getByTestId("grownup-placement").waitFor();
for (let step = 0; step < 8; step += 1) {
  const yeps = page.getByRole("button", { name: "Yep", exact: true });
  const count = await yeps.count();
  for (let i = 0; i < count; i += 1) await yeps.nth(i).click();
  const next = page.getByRole("button", { name: /Next subject|Set this starting point/ });
  await next.click();
  if (await page.getByTestId("placement-done").count()) break;
}
await page.getByTestId("placement-done").waitFor();
await shot(page, "29-ready");

await context.close();

const loading = await browser.newContext({ ...ipad, serviceWorkers: "block" });
const loadingPage = await loading.newPage();
await loadingPage.route("**/taxonomy.json", async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 4000));
  await route.continue();
});
const pending = loadingPage.goto(base, { waitUntil: "commit" });
await loadingPage.getByText("Getting the lesson book").waitFor({ timeout: 10000 });
await shot(loadingPage, "27-loading");
await pending.catch(() => {});
await loading.close();

const broken = await browser.newContext({ ...ipad, serviceWorkers: "block" });
const brokenPage = await broken.newPage();
await brokenPage.route("**/taxonomy.json", (route) => route.abort());
await brokenPage.goto(base, { waitUntil: "domcontentloaded" });
await brokenPage.getByText("can't find the lesson book").waitFor();
await shot(brokenPage, "28-error");
await broken.close();

console.log("art shots in", outDir, "reflect", sawReflect);
await browser.close();

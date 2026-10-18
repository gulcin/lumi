import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.LUMI_URL ?? "http://127.0.0.1:4179/lumi/?e2e=1";
const outDir = process.env.LUMI_SHOTS ?? "/opt/cursor/artifacts/screenshots";

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

async function finishSession(page) {
  for (let guard = 0; guard < 16; guard++) {
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
  await page.getByTestId("celebration").waitFor();
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices["iPad Pro 11"],
  serviceWorkers: "block",
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
await mkdir(outDir, { recursive: true });

await page.goto(base, { waitUntil: "networkidle" });
await page.getByTestId("name-skip").click();
await page.getByTestId("home-play").waitFor();
await page.screenshot({ path: `${outDir}/01-child-home.png` });

await page.getByTestId("home-play").click();
for (let i = 0; i < 8; i++) await answer(page);
await page.getByTestId("placement-done").click();
if (await page.getByTestId("inquiry-continue").count()) await page.getByTestId("inquiry-continue").click();
await page.getByTestId("exercise").waitFor();
await page.screenshot({ path: `${outDir}/02-exercise.png` });

await finishSession(page);
await page.getByTestId("again").click();
await finishSession(page);
await page.getByTestId("mastered-banner").waitFor();
await page.screenshot({ path: `${outDir}/03-celebration.png` });

await page.getByRole("button", { name: "Home" }).click();
await page.getByTestId("home-grownups").click();
await page.getByLabel("Or what is 19 + 8?").fill("27");
await page.getByRole("button", { name: "Open" }).click();
await page.getByTestId("parent-root").waitFor();
await page.getByTestId("mastered-list").waitFor();
const mastered = await page.getByTestId("mastered-list").innerText();
if (!mastered.trim()) throw new Error("Parent view did not list a mastered topic");
await page.screenshot({ path: `${outDir}/04-parent.png` });
console.log("Verified iPad flow. Mastered list:\n", mastered.split("\n").slice(0, 6).join("\n"));
await browser.close();

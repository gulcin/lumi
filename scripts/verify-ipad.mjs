import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.LUMI_URL ?? "http://127.0.0.1:4179/?e2e=1";
const outDir = process.env.LUMI_SHOTS ?? "/opt/cursor/artifacts/screenshots";

async function answer(page) {
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
    for (const id of token.split("|")) {
      await page.locator(`[data-order-id="${id}"]`).click();
    }
    await page.getByTestId("order-done").click();
  } else {
    await page.getByTestId("talk-yes").click();
  }
  await page.getByTestId("next").click();
}

async function finishSession(page) {
  for (let guard = 0; guard < 12; guard++) {
    if (await page.getByTestId("celebration").count()) return;
    if (await page.getByTestId("exercise").count()) {
      await answer(page);
      continue;
    }
    await page.waitForTimeout(200);
  }
  await page.getByTestId("celebration").waitFor();
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices["iPad Pro 11"],
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
await page.getByTestId("exercise").waitFor();
await page.screenshot({ path: `${outDir}/02-exercise.png` });

await finishSession(page);
await page.getByTestId("again").click();
await finishSession(page);
await page.getByTestId("mastered-banner").waitFor();
await page.screenshot({ path: `${outDir}/03-celebration.png` });

await page.getByRole("button", { name: "Home" }).click();
await page.getByTestId("home-grownups").click();
const hold = page.getByTestId("gate-hold");
await hold.dispatchEvent("pointerdown");
await page.waitForTimeout(3200);
await page.getByTestId("parent-root").waitFor();
await page.getByTestId("mastered-list").waitFor();
const mastered = await page.getByTestId("mastered-list").innerText();
if (!mastered.trim()) throw new Error("Parent view did not list a mastered topic");
await page.screenshot({ path: `${outDir}/04-parent.png` });
console.log("Verified iPad flow. Mastered list:\n", mastered.split("\n").slice(0, 6).join("\n"));
await browser.close();

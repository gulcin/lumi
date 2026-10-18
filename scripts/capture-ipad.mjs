import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.LUMI_URL ?? "http://127.0.0.1:4180/lumi/?e2e=1";
const outDir = process.env.LUMI_SHOTS ?? "/opt/cursor/artifacts/screenshots";
const FAMILY = "amber-river-cedar-maple-a1b2c3d4";

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
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
  const reflect = page.getByRole("button", { name: "What did you find out?" });
  if (await reflect.count()) {
    await reflect.click();
    await page.getByRole("button", { name: "I found out something new" }).click();
    return;
  }
  await page.getByTestId("next").click();
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices["iPad Pro 11"], serviceWorkers: "block" });
const page = await context.newPage();
page.setDefaultTimeout(20000);
await mkdir(outDir, { recursive: true });

await page.route("**/v1/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  const method = route.request().method();
  if (path.endsWith("/v1/families") && method === "POST") {
    await route.fulfill({ json: { code: FAMILY } });
    return;
  }
  if (path.endsWith("/v1/family")) {
    await route.fulfill({ json: { children: [] } });
    return;
  }
  if (path.endsWith("/v1/progress") && method === "POST") {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { progress: body.progress } });
    return;
  }
  if (path.endsWith("/v1/chat") && method === "POST") {
    await route.fulfill({ json: { reply: "People painted the animals they knew. Which animal would you paint?" } });
    return;
  }
  if (path.endsWith("/v1/chat")) {
    await route.fulfill({ json: { messages: [{ role: "user", content: "Why did people paint caves?", createdAt: new Date().toISOString() }] } });
    return;
  }
  await route.fulfill({ status: 404, json: { error: "missing" } });
});

await page.goto(base, { waitUntil: "networkidle" });
await page.getByPlaceholder("Your name").fill("Aida");
await page.getByRole("button", { name: "That's me" }).click();
await page.getByTestId("theme-home").waitFor();
const themes = await page.getByTestId("theme-home").innerText();
if (!themes.includes("Where we are in place and time")) throw new Error("Theme home is missing a PYP theme");
if (!themes.includes("Sharing the planet")) throw new Error("Theme home is missing Sharing the planet");
await shot(page, "01-theme-home");

await page.getByRole("button", { name: "What I love" }).click();
await page.getByTestId("interests").waitFor();
await page.getByRole("button", { name: /Animals/ }).click();
await shot(page, "02-interests");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByRole("button", { name: /Where we are in place and time/ }).click();
await page.getByText("Lumi's working on").first().waitFor();
await page.getByText("Coming up").first().waitFor();
await shot(page, "03-theme-legend");
await page.getByRole("button", { name: "Back", exact: true }).click();
await page.getByTestId("home-explore").click();
await page.getByPlaceholder("Search all lessons").fill("Cave Paintings");
await page.getByRole("button", { name: /Cave Paintings/ }).click();
await page.getByTestId("start-topic").click();
await page.getByTestId("inquiry").waitFor();
const inquiry = await page.getByTestId("inquiry").innerText();
if (!inquiry.includes("I wonder")) throw new Error("Stone Age lesson did not open with an inquiry");
if (!inquiry.includes("Where we are in place and time")) throw new Error("Inquiry is not on the place-and-time theme");
await shot(page, "04-stone-age-inquiry");

await answer(page);
await page.getByRole("button", { name: "Back", exact: true }).click();
await page.getByTestId("learner-badges").waitFor();
const badges = await page.getByTestId("learner-badges").innerText();
if (!badges.includes("Inquirer")) throw new Error("Learner profile badges are missing");
await shot(page, "05-learner-badges");

await page.getByTestId("home-explore").click();
await page.getByPlaceholder("Search all lessons").fill("Cave Paintings");
await page.getByRole("button", { name: /Cave Paintings/ }).click();
await page.getByTestId("start-topic").click();
for (let guard = 0; guard < 8; guard += 1) {
  if (await page.getByTestId("celebration").count()) break;
  if (await page.getByTestId("exercise").count() || await page.getByTestId("inquiry-continue").count()) {
    await answer(page);
    continue;
  }
  await page.waitForTimeout(200);
}
await page.getByTestId("celebration").waitFor();

await page.getByRole("button", { name: "Home" }).click();
await page.getByRole("button", { name: "Acorn shop" }).click();
await page.getByTestId("acorn-shop").waitFor();
const acorns = await page.getByTestId("acorn-shop").innerText();
if (acorns.startsWith("0")) throw new Error("Hands-on work did not earn acorns");
await shot(page, "06-acorn-shop");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByRole("button", { name: "Show what I made" }).click();
await page.getByTestId("journal").waitFor();
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const file = "/tmp/lumi-journal.png";
await writeFile(file, png);
await page.getByLabel("A few words").fill("A cave painting");
await page.getByTestId("journal-file").setInputFiles(file);
await page.getByText("A cave painting").waitFor();
const reminder = await page.locator("body").innerText();
if (!/face/i.test(reminder)) throw new Error("Journal did not remind the child about faces");
await shot(page, "07-photo-journal");
await page.getByRole("button", { name: "Back", exact: true }).click();

await page.getByTestId("home-grownups").click();
await page.getByLabel("Or what is 19 + 8?").fill("27");
await page.getByRole("button", { name: "Open" }).click();
await page.getByTestId("parent-root").waitFor();
await page.getByRole("tab", { name: "PYP themes" }).click();
await page.getByTestId("parent-themes").waitFor();
const parentThemes = await page.getByTestId("parent-themes").innerText();
if (!parentThemes.includes("Where we are in place and time")) throw new Error("Parent themes missing");
if (!/does not endorse/i.test(parentThemes)) throw new Error("Parent view missing the unofficial PYP note");
await shot(page, "08-parent-themes");

await page.getByRole("tab", { name: "Today" }).click();
await page.getByTestId("daily-note").waitFor();
const note = await page.getByTestId("daily-note").innerText();
if (!note.includes("Aida")) throw new Error("Daily note did not use the child's name");
await shot(page, "09-daily-note");

await page.getByRole("tab", { name: "Backup" }).click();
await page.getByRole("button", { name: "Create a family sync code" }).click();
await page.getByTestId("family-code").waitFor();
const code = (await page.getByTestId("family-code").innerText()).trim();
if (code !== FAMILY) throw new Error(`Unexpected family code: ${code}`);
await page.locator("img.qr").waitFor();
await shot(page, "10-sync-settings");

await page.getByRole("button", { name: "Back", exact: true }).click();
await page.getByTestId("home-chat").click();
await page.getByTestId("voice-chat").waitFor();
await page.getByLabel("Or type").fill("Why did people paint in caves?");
await page.getByTestId("chat-send").click();
await page.getByTestId("chat-reply").waitFor();
const reply = await page.getByTestId("chat-reply").innerText();
if (!reply.includes("animal")) throw new Error("Chat reply did not come back");
await shot(page, "11-voice-chat");

console.log("Captured iPad flows in", outDir);
await browser.close();

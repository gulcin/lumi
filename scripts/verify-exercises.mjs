import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { chromium, devices } from "playwright";

const port = 4225;
const origin = `http://127.0.0.1:${port}/lumi/?e2e=1`;
const shots = process.env.LUMI_SHOTS ?? "/opt/cursor/artifacts/screenshots/exercises";
const limit = Number(process.env.AUDIT_LIMIT || 0);
const taxonomy = JSON.parse(readFileSync(new URL("../public/data/taxonomy.json", import.meta.url), "utf8"));

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

const ipad = view("ipad-11-portrait", 834, 1194);
const layoutViews = [
  view("iphone", 390, 844),
  view("ipad-11-landscape", 1194, 834),
  view("ipad-13-portrait", 1024, 1366),
  view("ipad-13-landscape", 1366, 1024),
];

function spread(topics) {
  if (!limit || limit >= topics.length) return topics;
  const buckets = new Map();
  for (const topic of topics) {
    const list = buckets.get(topic.subject) ?? [];
    list.push(topic);
    buckets.set(topic.subject, list);
  }
  const lists = [...buckets.values()];
  const picked = [];
  let row = 0;
  while (picked.length < limit) {
    let added = false;
    for (const list of lists) {
      if (!list[row]) continue;
      picked.push(list[row]);
      added = true;
      if (picked.length >= limit) break;
    }
    if (!added) break;
    row += 1;
  }
  return picked;
}

const nameFilter = (process.env.AUDIT_NAMES ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const topics = nameFilter.length
  ? taxonomy.topics.filter((topic) => nameFilter.some((name) => topic.name.includes(name)))
  : spread(taxonomy.topics);

function progress() {
  return {
    version: 1,
    childName: "Aida",
    childKey: "child_exercise_aida",
    named: true,
    speechOn: false,
    soundOn: false,
    stars: 1,
    startGrade: 3,
    placement: {
      level: "growing",
      bandStart: 6,
      bandEnd: 7,
      assumedThroughAge: 5,
      correct: 4,
      total: 8,
      at: 1,
      startGrade: 3,
    },
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
  };
}

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

async function shot(page, path) {
  let last = new Error(`could not save ${path}`);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.screenshot({ path, fullPage: false });
      return;
    } catch (error) {
      last = error instanceof Error ? error : new Error(String(error));
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw last;
}

async function tap(locator) {
  await locator.tap({ timeout: 8000 });
}

async function stars(page) {
  await page.getByRole("heading", { name: "Hi, Aida." }).waitFor({ timeout: 15000 });
  const label = await page.locator(".star-line").getAttribute("aria-label");
  const count = Number.parseInt(label ?? "", 10);
  if (!Number.isFinite(count)) throw new Error(`stars unreadable: ${label}`);
  return count;
}

async function home(page) {
  const heading = page.getByRole("heading", { name: "Hi, Aida." });
  if (await heading.count()) {
    await page.evaluate(() => window.scrollTo(0, 0));
    return;
  }
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await heading.waitFor({ timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function openTopic(page, topicId) {
  await home(page);
  const started = await page.evaluate((id) => window.__lumiAudit?.start(id) ?? false, topicId);
  if (!started) throw new Error("audit start failed");
  await page.getByTestId("exercise").waitFor({ timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function measure(page) {
  return page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const exercise = document.querySelector("[data-testid='exercise']");
    const box = exercise?.getBoundingClientRect();
    const prompt = document.querySelector(".prompt");
    const tell = document.querySelector("[data-testid='tell-us']");
    const tellBox = tell?.getBoundingClientRect();
    return {
      html: Number.parseFloat(html.fontSize),
      body: Number.parseFloat(body.fontSize),
      prompt: prompt ? Number.parseFloat(getComputedStyle(prompt).fontSize) : 0,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      exerciseBottom: box ? Math.ceil(box.bottom) : 0,
      height: window.innerHeight,
      tellTop: tellBox ? tellBox.top : -1,
    };
  });
}

async function assertPicture(exercise) {
  const issues = await exercise.evaluate((root) => {
    const found = [];
    const clock = root.querySelector(".viz-clock");
    if (clock) {
      const hour = Number(clock.getAttribute("data-hour"));
      const minute = Number(clock.getAttribute("data-minute"));
      const angleOf = (hand) => {
        const transform = clock.querySelector(`[data-hand="${hand}"]`)?.getAttribute("transform") ?? "";
        const match = /rotate\(\s*(-?\d+(?:\.\d+)?)/.exec(transform);
        return match ? Number(match[1]) : Number.NaN;
      };
      const minuteAngle = angleOf("minute");
      const hourAngle = angleOf("hour");
      const expectMinute = minute * 6;
      const expectHour = (hour % 12) * 30 + minute * 0.5;
      if (Math.abs(minuteAngle - expectMinute) > 0.1) found.push(`minute hand ${minuteAngle}°, expected ${expectMinute}°`);
      if (Math.abs(hourAngle - expectHour) > 0.1) found.push(`hour hand ${hourAngle}°, expected ${expectHour}°`);
      const numbers = [...clock.querySelectorAll("text")].map((node) => (node.textContent ?? "").trim());
      for (const n of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]) {
        if (!numbers.includes(n)) found.push(`clock missing ${n}`);
      }
      const minuteWidth = Number(clock.querySelector('[data-hand="minute"]')?.getAttribute("stroke-width"));
      const hourWidth = Number(clock.querySelector('[data-hand="hour"]')?.getAttribute("stroke-width"));
      if (!(hourWidth > minuteWidth && minuteWidth > 0)) found.push("the hour hand is not the short thick hand");
      const spoken =
        minute === 0
          ? `${hour} o'clock`
          : minute === 15
            ? `quarter past ${hour}`
            : minute === 30
              ? `half past ${hour}`
              : minute === 45
                ? `quarter to ${(hour % 12) + 1}`
                : "";
      const kind = root.getAttribute("data-kind");
      const token = root.getAttribute("data-answer") ?? "";
      if (kind === "number" && (minute !== 0 || token !== String(hour))) found.push(`o'clock answer ${token} does not match ${hour}:00`);
      if (kind === "choice") {
        const label = (root.querySelector(`[data-choice-id="${token}"]`)?.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        if (label !== spoken) found.push(`clock answer "${label}" is not ${spoken}`);
      }
    }
    const cols = [...root.querySelectorAll(".bar-col")];
    if (cols.length) {
      const bars = cols.map((col) => {
        const bar = col.querySelector(".bar");
        return {
          value: Number(bar?.getAttribute("data-value")),
          height: bar ? Number.parseFloat(getComputedStyle(bar).height) : 0,
          label: (col.querySelector("span")?.textContent ?? "").replace(/\s+/g, " ").trim(),
        };
      });
      const maxValue = Math.max(...bars.map((bar) => bar.value));
      const tallest = bars.filter((bar) => bar.value === maxValue);
      if (tallest.length !== 1) found.push("two bars are equally tall");
      const maxHeight = Math.max(...bars.map((bar) => bar.height));
      for (const bar of bars) {
        const expected = maxValue === 0 ? 0 : (bar.value / maxValue) * maxHeight;
        if (Math.abs(bar.height - expected) > 1.5) found.push(`${bar.label} bar is ${bar.height}px for value ${bar.value}`);
      }
      if (root.getAttribute("data-kind") === "choice" && tallest[0]) {
        const token = root.getAttribute("data-answer") ?? "";
        const label = (root.querySelector(`[data-choice-id="${token}"]`)?.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        if (label !== tallest[0].label.toLowerCase()) found.push(`tallest bar is ${tallest[0].label}, answer is ${label}`);
      }
    }
    const title = document.querySelector(".topbar strong");
    if (title) {
      const style = getComputedStyle(title);
      const text = (title.textContent ?? "").trim();
      const clipped = title.scrollHeight > title.clientHeight + 4 || title.scrollWidth > title.clientWidth + 4;
      if (style.whiteSpace === "nowrap" || clipped) found.push(`topic title is cut short: ${text}`);
    }
    return found;
  });
  if (issues.length) throw new Error(issues.join("; "));
}

function layoutIssues(metrics, label) {
  const issues = [];
  if (metrics.html !== 16) issues.push(`${label} html font ${metrics.html}`);
  if (metrics.body < 17 || metrics.body > 20) issues.push(`${label} body font ${metrics.body}`);
  if (metrics.prompt < 21 || metrics.prompt > 32) issues.push(`${label} prompt font ${metrics.prompt}`);
  if (metrics.overflowX > 1) issues.push(`${label} horizontal overflow ${metrics.overflowX}`);
  if (metrics.exerciseBottom > metrics.height + 2) issues.push(`${label} exercise needs scroll (${metrics.exerciseBottom} > ${metrics.height})`);
  if (metrics.tellTop < 0 || metrics.tellTop > 120) issues.push(`${label} Tell us is off the top bar`);
  return issues;
}

async function hear(page) {
  const before = await page.evaluate(() => window.__speaks ?? 0);
  await tap(page.getByTestId("replay"));
  await page.waitForFunction((count) => (window.__speaks ?? 0) > count, before, { timeout: 4000 });
}

async function hint(page, exercise) {
  await tap(page.getByTestId("hint"));
  const text = (await page.getByTestId("hint-text").innerText()).trim();
  if (!text || text.length > 160) throw new Error(`hint missing or long: ${text}`);
  if (/^read each one/i.test(text)) throw new Error("hint is too vague");
  if ((await exercise.locator(".viz-clock").count()) && !/hand/i.test(text)) throw new Error("clock hint does not mention the hands");
  const token = (await exercise.getAttribute("data-answer")) ?? "";
  const kind = await exercise.getAttribute("data-kind");
  if (kind === "number" && token && token !== "0" && text.includes(token)) throw new Error("hint gives away the number");
  if (kind === "choice") {
    const label = (await exercise.locator(`[data-choice-id="${token}"]`).innerText()).replace(/\s+/g, " ").trim();
    if (label.length >= 3 && text.toLowerCase().includes(label.toLowerCase())) throw new Error("hint gives away the choice");
  }
}

async function answerWrong(page, exercise) {
  const kind = await exercise.getAttribute("data-kind");
  const token = (await exercise.getAttribute("data-answer")) ?? "";
  if (kind === "choice") {
    const choices = exercise.locator("[data-choice-id]");
    const count = await choices.count();
    let tapped = false;
    for (let i = 0; i < count; i += 1) {
      const id = await choices.nth(i).getAttribute("data-choice-id");
      if (id !== token) {
        await tap(choices.nth(i));
        tapped = true;
        break;
      }
    }
    if (!tapped) throw new Error("no wrong choice");
  } else if (kind === "number") {
    const digit = token === "1" || token.startsWith("1") ? "2" : "1";
    await tap(page.getByTestId(`key-${digit}`));
    await tap(page.getByTestId("key-ok"));
  } else if (kind === "order") {
    const ids = token.split("|").filter(Boolean);
    let wrong = [...ids].reverse();
    if (wrong.join("|") === token && ids.length >= 2) wrong = [ids[1], ids[0], ...ids.slice(2)];
    if (wrong.join("|") === token) throw new Error("order has no wrong arrangement");
    for (const id of wrong) await tap(exercise.locator(`[data-order-id="${id}"]`));
    await tap(page.getByTestId("order-done"));
  } else if (kind === "talk") {
    await tap(page.getByTestId("talk-no"));
  } else {
    throw new Error(`unknown kind ${kind}`);
  }
}

async function answerRight(page, exercise) {
  const kind = await exercise.getAttribute("data-kind");
  const token = (await exercise.getAttribute("data-answer")) ?? "";
  if (kind === "choice") {
    await tap(exercise.locator(`[data-choice-id="${token}"]`));
  } else if (kind === "number") {
    for (const ch of token) {
      if (ch === "-") await tap(page.getByTestId("key-neg"));
      else if (ch === ".") await tap(page.getByTestId("key-dot"));
      else await tap(page.getByTestId(`key-${ch}`));
    }
    await tap(page.getByTestId("key-ok"));
  } else if (kind === "order") {
    for (const id of token.split("|").filter(Boolean)) await tap(exercise.locator(`[data-order-id="${id}"]`));
    await tap(page.getByTestId("order-done"));
  } else if (kind === "talk") {
    await tap(page.getByTestId("talk-yes"));
  } else {
    throw new Error(`unknown kind ${kind}`);
  }
}

async function expectFeedback(page, heading) {
  await page.getByRole("heading", { name: heading }).waitFor({ timeout: 8000 });
  const explain = (await page.getByTestId("feedback-explain").innerText()).trim();
  if (!explain || /undefined|NaN/.test(explain)) throw new Error(`empty feedback for ${heading}`);
  const next = page.getByTestId("next");
  if (!(await next.isEnabled())) throw new Error("no way forward");
}

async function backHome(page) {
  await tap(page.getByRole("button", { name: "Back" }));
  await page.getByRole("heading", { name: "Hi, Aida." }).waitFor({ timeout: 15000 });
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const preview = startPreview();
try {
  await waitForServer(preview);
  await mkdir(shots, { recursive: true });
  const browser = await chromium.launch();
  const failures = [];
  const rows = [];
  const representatives = [];
  const seenGenerators = new Set();
  try {
    const context = await browser.newContext({ ...ipad.device, reducedMotion: "reduce", serviceWorkers: "block" });
    await context.addInitScript((saved) => {
      localStorage.setItem("lumi.progress.v1", JSON.stringify(saved));
      let speaks = 0;
      const synth = {
        cancel() {},
        getVoices() {
          return [];
        },
        addEventListener() {},
        removeEventListener() {},
        speak() {
          speaks += 1;
          window.__speaks = speaks;
        },
      };
      window.__speaks = 0;
      Object.defineProperty(window, "speechSynthesis", { configurable: true, get: () => synth });
      class FakeRec {
        start() {
          const said = "The hint was kind";
          this.onresult?.({ results: [[{ transcript: said }]] });
          this.onend?.();
        }
        stop() {}
      }
      window.SpeechRecognition = FakeRec;
      window.webkitSpeechRecognition = FakeRec;
    }, progress());
    const page = await context.newPage();
    const errors = [];
    const missing = [];
    const ignoreNoise = (text) =>
      text.includes("reading 'waiting'") ||
      text.includes("lumi-api.gulcin-lumi.workers.dev") ||
      text.includes("net::ERR_FAILED") ||
      text.includes("favicon.ico");
    page.on("pageerror", (error) => {
      const text = String(error);
      if (!ignoreNoise(text)) errors.push(text);
    });
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (!ignoreNoise(text)) errors.push(text);
    });
    page.on("response", (response) => {
      if (response.status() !== 404) return;
      const url = response.url();
      if (url.includes("favicon.ico")) return;
      missing.push(url);
    });

    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Hi, Aida." }).waitFor({ timeout: 15000 });

    let said = false;
    for (let index = 0; index < topics.length; index += 1) {
      const topic = topics[index];
      const label = `${topic.subject} · ${topic.name}`;
      try {
        const beforeWrong = await stars(page);
        await openTopic(page, topic.id);
        const exercise = page.getByTestId("exercise");
        const generator = (await exercise.getAttribute("data-generator")) ?? "unknown";
        const kind = (await exercise.getAttribute("data-kind")) ?? "";
        const metrics = await measure(page);
        const issues = layoutIssues(metrics, "ipad-11-portrait");
        if (issues.length) throw new Error(issues.join("; "));
        await assertPicture(exercise);
        if (!seenGenerators.has(generator) || /pyramid|pharaoh|electricity|conductor|switch|bulb|circuit/i.test(topic.name)) {
          seenGenerators.add(generator);
          const file = `${shots}/${slug(generator)}-${slug(topic.name).slice(0, 48)}.png`;
          await shot(page, file);
          representatives.push({ generator, kind, id: topic.id, name: topic.name, subject: topic.subject, file });
        }
        await hear(page);
        await hint(page, exercise);
        if (!said) {
          await tap(page.getByTestId("tell-us"));
          await page.getByTestId("tell-dictate").waitFor();
          await tap(page.getByTestId("tell-dictate"));
          await page.waitForFunction(() => {
            const note = document.querySelector("[data-testid='tell-note']");
            return note instanceof HTMLTextAreaElement && note.value.includes("The hint was kind");
          });
          await tap(page.getByRole("button", { name: "Not now" }));
          await page.getByTestId("tell-card").waitFor({ state: "hidden" });
          said = true;
        }
        await answerWrong(page, exercise);
        await expectFeedback(page, "Good try.");
        await backHome(page);
        const afterWrong = await stars(page);
        if (afterWrong !== beforeWrong) throw new Error(`wrong try changed stars ${beforeWrong} -> ${afterWrong}`);

        await openTopic(page, topic.id);
        const again = page.getByTestId("exercise");
        await answerRight(page, again);
        await expectFeedback(page, "Yes!");
        await backHome(page);
        const afterRight = await stars(page);
        if (afterRight <= afterWrong) throw new Error(`right try did not add a star (${afterWrong} -> ${afterRight})`);
        rows.push({ subject: topic.subject, name: topic.name, generator, kind, status: "pass" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${label}: ${message}`);
        rows.push({ subject: topic.subject, name: topic.name, generator: "", kind: "", status: "fail", error: message });
        try {
          const file = `${shots}/fail-${slug(topic.name).slice(0, 48)}.png`;
          await page.screenshot({ path: file, fullPage: false });
        } catch {
          // the page may already be closed
        }
        await page.goto(origin, { waitUntil: "domcontentloaded" }).catch(() => {});
        await page.getByRole("heading", { name: "Hi, Aida." }).waitFor({ timeout: 15000 }).catch(() => {});
      }
      if ((index + 1) % 50 === 0) console.log(`exercises ${index + 1}/${topics.length} failures ${failures.length}`);
    }

    if (!said) failures.push("Say it was never tried");

    const clockContext = await browser.newContext({
      ...view("iphone", 390, 844).device,
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await clockContext.addInitScript((saved) => {
      localStorage.setItem("lumi.progress.v1", JSON.stringify(saved));
    }, progress());
    const clockPage = await clockContext.newPage();
    await clockPage.goto(origin, { waitUntil: "domcontentloaded" });
    await clockPage.getByRole("heading", { name: "Hi, Aida." }).waitFor({ timeout: 15000 });
    const faces = [
      [3, 0, "clock-3-00.png"],
      [3, 30, "clock-half-past.png"],
      [3, 15, "clock-quarter-past.png"],
      [3, 45, "clock-quarter-to.png"],
    ];
    for (const [hour, minute, file] of faces) {
      try {
        const started = await clockPage.evaluate(
          ([faceHour, faceMinute]) => window.__lumiAudit?.showClock(faceHour, faceMinute) ?? false,
          [hour, minute],
        );
        if (!started) throw new Error("showClock failed");
        const exercise = clockPage.getByTestId("exercise");
        await exercise.waitFor({ timeout: 15000 });
        await assertPicture(exercise);
        if ((await clockPage.getByTestId("hint-text").count()) === 0) await tap(clockPage.getByTestId("hint"));
        const hintText = (await clockPage.getByTestId("hint-text").innerText()).trim();
        if (!/hand/i.test(hintText) || /read each one/i.test(hintText)) throw new Error(`clock hint: ${hintText}`);
        const title = (await clockPage.locator(".topbar strong").innerText()).replace(/\s+/g, " ");
        if (!/telling time/i.test(title)) throw new Error(`clock header is "${title}"`);
        const metrics = await measure(clockPage);
        const issues = layoutIssues(metrics, "iphone-clock");
        if (issues.length) throw new Error(issues.join("; "));
        await shot(clockPage, `${shots}/${file}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`clock ${hour}:${String(minute).padStart(2, "0")}: ${message}`);
        await clockPage.screenshot({ path: `${shots}/fail-${file}`, fullPage: false }).catch(() => {});
      }
    }
    const compare = taxonomy.topics.find((topic) => topic.name === "Comparing durations");
    if (compare) {
      try {
        await openTopic(clockPage, compare.id);
        await assertPicture(clockPage.getByTestId("exercise"));
        const prompt = (await clockPage.locator(".prompt").innerText()).replace(/\s+/g, " ");
        if (!/longer|shorter/i.test(prompt)) throw new Error(`duration prompt: ${prompt}`);
        const title = (await clockPage.locator(".topbar strong").innerText()).replace(/\s+/g, " ");
        if (!/comparing durations/i.test(title)) throw new Error(`duration header is "${title}"`);
        await shot(clockPage, `${shots}/iphone-comparing-durations.png`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`Comparing durations: ${message}`);
      }
    } else failures.push("Comparing durations topic is missing");
    await clockContext.close();
    console.log("clock faces checked");

    for (const layout of layoutViews) {
      const layoutContext = await browser.newContext({ ...layout.device, reducedMotion: "reduce", serviceWorkers: "block" });
      await layoutContext.addInitScript((saved) => {
        localStorage.setItem("lumi.progress.v1", JSON.stringify(saved));
      }, progress());
      const layoutPage = await layoutContext.newPage();
      await layoutPage.goto(origin, { waitUntil: "domcontentloaded" });
      await layoutPage.getByRole("heading", { name: "Hi, Aida." }).waitFor({ timeout: 15000 });
      const sample = representatives.filter((item, index, all) => all.findIndex((other) => other.generator === item.generator) === index);
      for (const item of sample) {
        try {
          await openTopic(layoutPage, item.id);
          await layoutPage.getByTestId("hint").tap();
          const metrics = await measure(layoutPage);
          const issues = layoutIssues(metrics, layout.name);
          if (issues.length) throw new Error(issues.join("; "));
          await assertPicture(layoutPage.getByTestId("exercise"));
          await shot(layoutPage, `${shots}/${layout.name}-${slug(item.generator)}.png`);
          await tap(layoutPage.getByRole("button", { name: "Back" }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`${layout.name} · ${item.generator} · ${item.name}: ${message}`);
          await layoutPage.screenshot({ path: `${shots}/fail-${layout.name}-${slug(item.generator)}.png`, fullPage: false }).catch(() => {});
          await layoutPage.goto(origin, { waitUntil: "domcontentloaded" }).catch(() => {});
        }
      }
      await layoutContext.close();
      console.log(layout.name, "layout ok");
    }

    if (errors.length) failures.push(`console: ${[...new Set(errors)].slice(0, 8).join(" | ")}`);
    if (missing.length) failures.push(`404: ${[...new Set(missing)].slice(0, 8).join(" | ")}`);
    await context.close();
  } finally {
    await browser.close();
  }

  const summary = new Map();
  for (const row of rows) {
    const key = row.generator || "failed";
    const bucket = summary.get(key) ?? { generator: key, pass: 0, fail: 0 };
    if (row.status === "pass") bucket.pass += 1;
    else bucket.fail += 1;
    summary.set(key, bucket);
  }
  const report = {
    topics: rows.length,
    failures,
    generators: [...summary.values()].sort((a, b) => a.generator.localeCompare(b.generator)),
    shots: representatives,
  };
  await writeFile(`${shots}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ topics: rows.length, failureCount: failures.length, generators: report.generators }, null, 2));
  if (failures.length) {
    throw new Error(failures.slice(0, 30).join("\n"));
  }
  console.log("exercise audit ok");
} finally {
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    preview.kill("SIGTERM");
  }
}

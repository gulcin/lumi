import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildInfo, versionLabel } from "../src/lib/buildInfo";
import {
  dismissKidNotice,
  kidNoteFor,
  openKidNotice,
  parseChangelog,
  serviceWorkerCacheId,
  type KeyStore,
} from "../src/lib/version";

function memory(seed: Record<string, string> = {}): KeyStore {
  const data = { ...seed };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

describe("Lumi version", () => {
  it("stamps semver 1.3.1 at build time", () => {
    expect(pkg.version).toBe("1.3.1");
    expect(buildInfo.version).toBe(pkg.version);
    expect(buildInfo.sha).toMatch(/^[0-9a-f]{7,}$|^dev$/);
    expect(buildInfo.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(versionLabel()).toBe(`v1.3.1 · ${buildInfo.sha} · ${buildInfo.date}`);
    expect(serviceWorkerCacheId(pkg.version)).toBe("lumi-v1.3.1");
    expect(viteConfig).toContain("cacheId: serviceWorkerCacheId(lumiVersion)");
    expect(viteConfig).toContain('registerType: "prompt"');
    expect(viteConfig).toContain('return setHeader(name, "no-cache")');
  });

  it("reads the Keep a Changelog entries", () => {
    const notes = parseChangelog(changelog);
    expect(notes[0]?.version).toBe("1.3.1");
    expect(notes[0]?.date).toBe("2026-10-18");
    expect(notes.map((note) => note.version)).toEqual(["1.3.1", "1.3.0", "1.2.0", "1.1.2", "1.1.1", "1.1.0", "1.0.0"]);
    expect(notes[0]?.intro.join(" ")).toMatch(/clock/i);
    expect(notes[0]?.sections.find((section) => section.title === "Fixed")?.items.join(" ")).toMatch(/minute hand/);
    const audit = notes.find((note) => note.version === "1.3.0");
    expect(audit?.intro.join(" ")).toMatch(/wrong try/i);
    expect(audit?.sections.find((section) => section.title === "Added")?.items.join(" ")).toMatch(/hint/i);
    expect(audit?.sections.find((section) => section.title === "Fixed")?.items.join(" ")).toMatch(/tallest/);
    const tell = notes.find((note) => note.version === "1.2.0");
    expect(tell?.intro.join(" ")).toMatch(/bug or an idea/i);
    expect(tell?.sections.find((section) => section.title === "Added")?.items.join(" ")).toMatch(/Tell us/);
    const typefix = notes.find((note) => note.version === "1.1.2");
    expect(typefix?.intro.join(" ")).toMatch(/comfortable size/i);
    const icon = notes.find((note) => note.version === "1.1.1");
    expect(icon?.intro.join(" ")).toMatch(/painted fox/i);
    expect(icon?.sections.find((section) => section.title === "Fixed")?.items.join(" ")).toMatch(/apple-touch-icon/);
    const update = notes.find((note) => note.version === "1.1.0");
    expect(update?.intro.join(" ")).toMatch(/home screen/i);
    expect(update?.sections.find((section) => section.title === "Added")?.items.join(" ")).toMatch(/Lumi learned something new/);
    const first = notes.find((note) => note.version === "1.0.0");
    const added = first?.sections.find((section) => section.title === "Added");
    expect(added?.items.length).toBeGreaterThan(5);
    expect(added?.items.join(" ")).toMatch(/PYP/);
    expect(added?.items.join(" ")).toMatch(/What's new/);
    expect(first?.intro.join(" ")).toMatch(/grade 3/i);
    expect(kidNoteFor("1.0.0")).toMatch(/pictures/);
    expect(kidNoteFor("1.1.0")).toMatch(/lessons stayed/i);
    expect(kidNoteFor("1.1.1")).toMatch(/home screen/i);
    expect(kidNoteFor("1.1.2")).toMatch(/right size/i);
    expect(kidNoteFor("1.2.0")).toMatch(/bug or an idea/i);
    expect(kidNoteFor("1.3.0")).toMatch(/hint/i);
    expect(kidNoteFor("1.3.1")).toMatch(/clock/i);
    expect(kidNoteFor("9.9.9").length).toBeGreaterThan(0);
  });

  it("shows New! after an update and stays quiet on a first launch", () => {
    const first = memory();
    expect(openKidNotice(first, "1.0.0")).toBe(false);
    expect(openKidNotice(first, "1.0.0")).toBe(false);

    const returning = memory({ "lumi.progress.v1": "{}" });
    expect(openKidNotice(returning, "1.0.0")).toBe(true);
    dismissKidNotice(returning, "1.0.0");
    expect(openKidNotice(returning, "1.0.0")).toBe(false);
    expect(openKidNotice(returning, "1.1.0")).toBe(true);
  });
});

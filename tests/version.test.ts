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
  it("starts at semver 1.0.0 and stamps the build", () => {
    expect(pkg.version).toBe("1.0.0");
    expect(buildInfo.version).toBe(pkg.version);
    expect(buildInfo.sha).toMatch(/^[0-9a-f]{7,}$|^dev$/);
    expect(buildInfo.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(versionLabel()).toBe(`v1.0.0 · ${buildInfo.sha} · ${buildInfo.date}`);
    expect(serviceWorkerCacheId(pkg.version)).toBe("lumi-v1.0.0");
    expect(viteConfig).toContain("cacheId: serviceWorkerCacheId(lumiVersion)");
  });

  it("reads the Keep a Changelog entry for 1.0.0", () => {
    const notes = parseChangelog(changelog);
    expect(notes[0]?.version).toBe("1.0.0");
    expect(notes[0]?.date).toBe("2026-10-18");
    expect(notes.map((note) => note.version)).not.toContain("Unreleased");
    const added = notes[0]?.sections.find((section) => section.title === "Added");
    expect(added?.items.length).toBeGreaterThan(5);
    expect(added?.items.join(" ")).toMatch(/PYP/);
    expect(added?.items.join(" ")).toMatch(/What's new/);
    expect(notes[0]?.intro.join(" ")).toMatch(/grade 3/i);
    expect(kidNoteFor("1.0.0")).toMatch(/pictures/);
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

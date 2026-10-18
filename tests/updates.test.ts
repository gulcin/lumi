import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROGRESS_KEY, SEEN_VERSION_KEY } from "../src/lib/version";
import { CHECK_INTERVAL_MS, planUpdate } from "../src/lib/updates";

const sw = readFileSync(new URL("../src/lib/swUpdates.ts", import.meta.url), "utf8");

describe("in-place updates", () => {
  it("shows a banner, waits out a lesson, and applies on the next launch", () => {
    expect(planUpdate({ waiting: false, lesson: false, deferred: false, deferredThisSession: false, applying: false })).toBe("idle");
    expect(planUpdate({ waiting: true, lesson: false, deferred: false, deferredThisSession: false, applying: false })).toBe("banner");
    expect(planUpdate({ waiting: true, lesson: true, deferred: false, deferredThisSession: false, applying: false })).toBe("defer");
    expect(planUpdate({ waiting: true, lesson: false, deferred: true, deferredThisSession: true, applying: false })).toBe("idle");
    expect(planUpdate({ waiting: true, lesson: false, deferred: true, deferredThisSession: false, applying: false })).toBe("apply");
    expect(planUpdate({ waiting: true, lesson: true, deferred: true, deferredThisSession: false, applying: false })).toBe("defer");
    expect(planUpdate({ waiting: true, lesson: false, deferred: false, deferredThisSession: false, applying: true })).toBe("idle");
  });

  it("checks on a half-hour timer and leaves progress keys alone", () => {
    expect(CHECK_INTERVAL_MS).toBe(30 * 60 * 1000);
    expect(PROGRESS_KEY).toBe("lumi.progress.v1");
    expect(SEEN_VERSION_KEY).toBe("lumi.seenVersion");
    expect(sw).toContain('updateViaCache: "none"');
    expect(sw).toContain('cache: "no-store"');
    expect(sw).toContain("visibilitychange");
    expect(sw).toContain("CHECK_INTERVAL_MS");
    expect(sw).not.toContain("lumi.progress");
  });
});

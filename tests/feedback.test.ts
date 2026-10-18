import { describe, expect, it } from "vitest";
import { createReport, FEEDBACK_KEY, MAILTO_LIMIT, MUM_EMAIL, reportMailto } from "../src/lib/feedback";
import { feedbackUrl, readReports, rememberReport } from "../src/lib/feedbackStore";
import { PROGRESS_KEY } from "../src/lib/version";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("feedback", () => {
  it("keeps a report on its own key and builds a short mailto", () => {
    const report = createReport({
      kind: "bug",
      note: "The words were huge. ".repeat(200),
      screen: "session",
      lesson: "Spell garden",
      skill: "topic-1",
      version: "1.2.0",
      device: "iPhone",
      viewport: "390x844",
      createdAt: Date.UTC(2026, 9, 18, 12, 0, 0),
      id: "r1",
    });
    expect(report.screen).toBe("Lesson");
    expect(report.note.length).toBeLessThanOrEqual(1000);
    expect(FEEDBACK_KEY).not.toBe(PROGRESS_KEY);
    const store = memory();
    rememberReport(store, report);
    const saved = readReports(store);
    expect(saved).toEqual([report]);
    expect(readReports(store)).toBe(saved);
    expect(store.getItem(PROGRESS_KEY)).toBeNull();

    const href = reportMailto(report);
    expect(href.startsWith(`mailto:${MUM_EMAIL}?`)).toBe(true);
    expect(href.length).toBeLessThanOrEqual(MAILTO_LIMIT);
    const url = new URL(href);
    expect(url.searchParams.get("subject")).toBe("Lumi report – 1.2.0 – Lesson");
    const body = url.searchParams.get("body") ?? "";
    expect(body).toContain("Type: Bug");
    expect(body).toContain("Screen: Lesson");
    expect(body).toContain("Lesson: Spell garden");
    expect(body).toContain("Skill: topic-1");
    expect(body).toContain("Version: 1.2.0");
    expect(body).toContain("Viewport: 390x844");
    expect(body).toContain("2026-10-18");
  });

  it("does not require a live worker to keep the note", () => {
    expect(feedbackUrl()).toBe("");
  });
});

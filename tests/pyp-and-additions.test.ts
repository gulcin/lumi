import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildThemeMap } from "../scripts/pyp-map.mjs";
import { mergeAdditions } from "../scripts/merge-additions.mjs";
import { createExercise } from "../src/lib/generators";
import { mulberry32 } from "../src/lib/rng";
import type { Topic } from "../src/lib/types";

const marble = JSON.parse(readFileSync(new URL("../vendor/marble/topics.json", import.meta.url), "utf8")) as {
  topics: Topic[];
};
const marbleDeps = JSON.parse(readFileSync(new URL("../vendor/marble/dependencies.json", import.meta.url), "utf8")) as {
  dependencies: { topicId: string; prerequisiteId: string; strength: string; reason: string }[];
};
const marbleClusters = JSON.parse(readFileSync(new URL("../vendor/marble/clusters.json", import.meta.url), "utf8")) as {
  clusters: unknown[];
};
const additions = JSON.parse(readFileSync(new URL("../vendor/lumi/additions.json", import.meta.url), "utf8"));

describe("PYP theme map", () => {
  const merged = mergeAdditions(marble.topics, marbleDeps.dependencies, marbleClusters.clusters, additions);
  const map = buildThemeMap(merged.topics);

  it("maps every topic to one theme and one subject area", () => {
    expect(map.missing).toEqual([]);
    expect(Object.keys(map.topics)).toHaveLength(merged.topics.length);
    for (const topic of merged.topics) {
      const entry = map.topics[topic.id];
      expect(map.themes.map((theme: { id: string }) => theme.id)).toContain(entry.theme);
      expect(map.areas).toContain(entry.area);
    }
  });

  it("puts Stone Age additions on Where we are in place and time", () => {
    for (const topic of additions.topics) {
      expect(map.topics[topic.id]).toEqual({ theme: "where-we-are", area: "social studies" });
    }
  });

  it("matches the checked-in map", () => {
    const checked = JSON.parse(readFileSync(new URL("../src/data/pyp-theme-map.json", import.meta.url), "utf8"));
    expect(checked.topics).toEqual(map.topics);
  });
});

describe("Lumi additions merge", () => {
  const merged = mergeAdditions(marble.topics, marbleDeps.dependencies, marbleClusters.clusters, additions);

  it("keeps Marble topics and adds lumi_ ids with the shared schema", () => {
    expect(marble.topics).toHaveLength(1590);
    expect(merged.topics).toHaveLength(1590 + additions.topics.length);
    for (const topic of additions.topics) {
      expect(topic.id.startsWith("lumi_")).toBe(true);
      const stored = merged.topics.find((item) => item.id === topic.id);
      expect(stored?.origin).toBe("lumi");
      expect(stored?.name).toBe(topic.name);
      expect(stored?.evidence.length).toBeGreaterThan(0);
      expect(stored?.ageRangeStart).toBeGreaterThanOrEqual(5);
      expect(stored?.ageRangeEnd).toBeLessThanOrEqual(11);
    }
  });

  it("leads the Stone Age timeline into Ancient Egypt timeline topics", () => {
    const intoEgypt = merged.dependencies.filter(
      (edge) => edge.prerequisiteId === "lumi_stone_timeline" && (edge.topicId === "mt_C3eNLQJlgt" || edge.topicId === "mt_pTz6u49fQt"),
    );
    expect(intoEgypt.length).toBeGreaterThanOrEqual(2);
    expect(intoEgypt.some((edge) => edge.strength === "hard" && edge.topicId === "mt_C3eNLQJlgt")).toBe(true);
  });

  it("gives each Stone Age topic a hands-on activity", () => {
    for (const topic of additions.topics) {
      const exercise = createExercise(topic, mulberry32(3));
      expect(exercise.generatorId).toBe("stone-age");
      expect(exercise.prompt.length).toBeGreaterThan(0);
    }
  });
});

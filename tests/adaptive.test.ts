import { describe, expect, it } from "vitest";
import { buildCatalog } from "../src/lib/catalog";
import {
  frontierEnd,
  isUnlocked,
  planSession,
  prereqSatisfied,
  scoreTopic,
  topicStatus,
  whatsNext,
} from "../src/lib/adaptive";
import { hasHandsOn } from "../src/lib/generators";
import { isReviewDue } from "../src/lib/mastery";
import { applyAttempt, emptyProgress, markMastered } from "../src/lib/progress";
import { mulberry32 } from "../src/lib/rng";
import type { Placement, Progress, TaxonomyFile, Topic } from "../src/lib/types";

function topic(partial: Partial<Topic> & Pick<Topic, "id" | "name">): Topic {
  return {
    type: "PROCEDURAL",
    subject: "Mathematics",
    domain: "Addition & Subtraction",
    description: partial.name,
    ageRangeStart: 6,
    ageRangeEnd: 7,
    evidence: ["Show it once", "Show it again"],
    assessmentPrompt: "Can they do it?",
    ...partial,
  };
}

function makeCatalog(topics: Topic[], edges: TaxonomyFile["dependencies"] = []) {
  const data: TaxonomyFile = {
    version: "v1",
    source: "test",
    attribution: "test",
    topicCount: topics.length,
    topics,
    dependencies: edges,
    clusters: [],
  };
  return buildCatalog(data);
}

function placed(level: Placement["level"] = "ready"): Progress {
  const base = emptyProgress(1_700_000_000_000);
  const placement: Placement =
    level === "emerging"
      ? { level, bandStart: 5, bandEnd: 6, assumedThroughAge: 4, correct: 1, total: 8, at: base.createdAt }
      : level === "growing"
        ? { level, bandStart: 6, bandEnd: 7, assumedThroughAge: 5, correct: 4, total: 8, at: base.createdAt }
        : { level, bandStart: 6, bandEnd: 8, assumedThroughAge: 6, correct: 7, total: 8, at: base.createdAt };
  return { ...base, named: true, placement };
}

describe("adaptive selection", () => {
  const early = topic({ id: "early", name: "Counting objects", ageRangeStart: 5, ageRangeEnd: 6, domain: "Counting & Cardinality" });
  const bonds = topic({ id: "bonds", name: "Number bonds", ageRangeStart: 6, ageRangeEnd: 7 });
  const algebra = topic({ id: "algebra", name: "Solving Linear Equations", domain: "Algebra", ageRangeStart: 12, ageRangeEnd: 14 });
  const high = topic({ id: "high", name: "Adding larger numbers", ageRangeStart: 14, ageRangeEnd: 15 });
  const young = ["a", "b", "c", "d", "e", "f"].map((id, index) =>
    topic({ id, name: `Add ${index}`, ageRangeStart: 6, ageRangeEnd: 8, subject: index % 2 ? "English" : "Mathematics", domain: index % 2 ? "Grammar & Punctuation" : "Addition & Subtraction" }),
  );

  it("blocks a topic until each hard prerequisite is mastered or assumed", () => {
    const catalog = makeCatalog(
      [early, bonds],
      [{ topicId: "bonds", prerequisiteId: "early", strength: "hard", reason: "Bonds need counting first" }],
    );
    const emerging = placed("emerging");
    expect(prereqSatisfied("early", catalog, emerging)).toBe(false);
    expect(isUnlocked(bonds, catalog, emerging)).toBe(false);
    expect(topicStatus(bonds, catalog, emerging)).toBe("later");

    const ready = placed("ready");
    expect(prereqSatisfied("early", catalog, ready)).toBe(true);
    expect(isUnlocked(bonds, catalog, ready)).toBe(true);

    const mastered = markMastered(emerging, "early", 10);
    expect(isUnlocked(bonds, catalog, mastered)).toBe(true);
  });

  it("prefers topics whose soft prerequisites are already in place", () => {
    const helper = topic({ id: "helper", name: "Shapes", domain: "Geometry", ageRangeStart: 6, ageRangeEnd: 7 });
    const withSoft = topic({ id: "money", name: "Coin values", domain: "Measurement", ageRangeStart: 6, ageRangeEnd: 7 });
    const plain = topic({ id: "plain", name: "Adding within 10", ageRangeStart: 6, ageRangeEnd: 7 });
    const catalog = makeCatalog(
      [helper, withSoft, plain],
      [{ topicId: "money", prerequisiteId: "helper", strength: "soft", reason: "Shapes help with coin faces" }],
    );
    const progress = markMastered(placed("ready"), "helper", 10);
    const rng = () => 0;
    const softScore = scoreTopic(withSoft, catalog, progress, hasHandsOn, 8, rng);
    const plainScore = scoreTopic(plain, catalog, progress, hasHandsOn, 8, rng);
    expect(softScore).toBeGreaterThan(plainScore);
  });

  it("mixes subjects and stays near the frontier", () => {
    const catalog = makeCatalog([...young, high, algebra]);
    const progress = placed("ready");
    const plan = planSession(catalog, progress, progress.createdAt, mulberry32(4), hasHandsOn);
    const ids = plan.map((item) => item.topicId);
    expect(plan.length).toBeGreaterThanOrEqual(6);
    expect(ids).not.toContain("high");
    expect(ids).not.toContain("algebra");
    const subjects = new Set(ids.map((id) => catalog.byId.get(id)?.subject));
    expect(subjects.size).toBeGreaterThan(1);
    for (const id of ids) {
      const item = catalog.byId.get(id)!;
      expect(isUnlocked(item, catalog, progress)).toBe(true);
      expect(item.ageRangeStart).toBeLessThanOrEqual(frontierEnd(catalog, progress) + 1);
    }
  });

  it("repeats in-progress topics so mastery can be earned across sessions", () => {
    const catalog = makeCatalog(young);
    let progress = placed("ready");
    progress = applyAttempt(progress, {
      topicId: "a",
      correct: true,
      sessionId: "s1",
      at: 1,
      role: "practice",
    }).progress;
    const plan = planSession(catalog, progress, progress.createdAt, mulberry32(2), hasHandsOn);
    const repeats = plan.filter((item) => item.topicId === "a");
    expect(repeats.length).toBeGreaterThanOrEqual(2);
  });

  it("has no age cap once mastery lifts the frontier", () => {
    const bridge = topic({ id: "bridge", name: "Bridge skill", ageRangeStart: 13, ageRangeEnd: 14 });
    const catalog = makeCatalog([...young, high, bridge]);
    const before = planSession(catalog, placed("ready"), 5, mulberry32(1), hasHandsOn).map((item) => item.topicId);
    expect(before).not.toContain("high");
    const raised = markMastered(placed("ready"), "bridge", 20);
    expect(frontierEnd(catalog, raised)).toBeGreaterThanOrEqual(14);
    const after = planSession(catalog, raised, 20, mulberry32(1), hasHandsOn).map((item) => item.topicId);
    expect(after).toContain("high");
  });

  it("schedules a spaced review without dropping it from the path", () => {
    const catalog = makeCatalog([topic({ id: "old", name: "Known bonds", ageRangeStart: 7, ageRangeEnd: 8 })]);
    let progress = markMastered(placed("ready"), "old", 1_000);
    const state = progress.topics.old!;
    progress = {
      ...progress,
      topics: { old: { ...state, nextReviewAt: 1_000 } },
    };
    expect(isReviewDue(progress.topics.old, 5_000)).toBe(true);
    const plan = planSession(catalog, progress, 5_000, mulberry32(3), hasHandsOn);
    expect(plan.some((item) => item.topicId === "old" && item.role === "review")).toBe(true);
    expect(plan.filter((item) => item.topicId === "old")).toHaveLength(1);
  });

  it("explains the next step with prerequisite reasons", () => {
    const catalog = makeCatalog(
      [early, bonds],
      [{ topicId: "bonds", prerequisiteId: "early", strength: "hard", reason: "Bonds need counting first" }],
    );
    const locked = whatsNext(catalog, placed("emerging"), hasHandsOn, 5);
    expect(locked.find((item) => item.topic.id === "bonds")).toBeUndefined();
    const ready = whatsNext(catalog, placed("ready"), hasHandsOn, 5);
    expect(ready.some((item) => item.topic.id === "bonds" && item.ready)).toBe(true);
  });
});

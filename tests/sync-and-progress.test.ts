import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { acornBalance, buyItem, earnAcorn } from "../src/lib/acorns";
import { awardBadge } from "../src/lib/badges";
import { hasStruggleGap, isUnlocked, planSession } from "../src/lib/adaptive";
import { buildCatalog } from "../src/lib/catalog";
import { createFamilyCode, isFamilyCode } from "../src/lib/familyCode";
import { applyGrownupAnswers, selectPlacementPrompts } from "../src/lib/grownupPlacement";
import { interestBoost } from "../src/lib/interests";
import { MIGRATION_LOCK_KEY, selectPending } from "../src/lib/migratePlan";
import { moderationReason } from "../src/lib/moderate";
import { buildDailyNotes } from "../src/lib/parentNote";
import { gradeAnchorAge, placementFromScore, placementItems } from "../src/lib/placement";
import { adminAuthorized } from "../src/lib/adminAuth";
import { applyAttempt, emptyProgress } from "../src/lib/progress";
import { mergeProgress, mergeTopicState } from "../src/lib/syncMerge";
import { mulberry32 } from "../src/lib/rng";
import { hasHandsOn } from "../src/lib/generators";
import type { Progress, TaxonomyFile, Topic, TopicState } from "../src/lib/types";

function topic(partial: Partial<Topic> & Pick<Topic, "id" | "name">): Topic {
  return {
    type: "CONCEPTUAL",
    subject: "History",
    domain: "Stone Age",
    description: partial.name,
    ageRangeStart: 8,
    ageRangeEnd: 9,
    evidence: ["Show it"],
    assessmentPrompt: "Can they?",
    ...partial,
  };
}

function catalogOf(topics: Topic[], edges: TaxonomyFile["dependencies"] = []) {
  const data: TaxonomyFile = {
    version: "v1",
    source: "test",
    attribution: "test",
    topicCount: topics.length,
    topics,
    dependencies: edges,
    clusters: [],
    pypMap: {
      version: 1,
      unofficial: true,
      note: "test",
      themes: [],
      areas: [],
      topics: Object.fromEntries(topics.map((item) => [item.id, { theme: "where-we-are" as const, area: "social studies" as const }])),
    },
  };
  return buildCatalog(data);
}

function state(partial: Partial<TopicState>): TopicState {
  return {
    attempts: [],
    mastered: false,
    reviewStage: 0,
    lapses: 0,
    attemptFloor: 0,
    ...partial,
  };
}

describe("grade 3 placement", () => {
  it("starts a strong warm-up at grade 3, about age 8, and can drop to fill gaps", () => {
    expect(gradeAnchorAge(3)).toBe(8);
    const ready = placementFromScore(8, 8, 50, 3);
    expect(ready.level).toBe("ready");
    expect(ready.bandStart).toBe(8);
    expect(ready.assumedThroughAge).toBe(7);
    expect(ready.startGrade).toBe(3);
    const low = placementFromScore(1, 8, 50, 3);
    expect(low.level).toBe("emerging");
    expect(low.bandStart).toBeLessThan(ready.bandStart);
    expect(placementItems(3)).toHaveLength(8);
    expect(placementItems(1)[0]?.answer).toBe(5);
    expect(placementItems(5).some((item) => (item.answer ?? 0) >= 90)).toBe(true);
  });

  it("pulls an assumed prerequisite back in after a shaky lesson", () => {
    const early = topic({ id: "early", name: "Counting", ageRangeStart: 5, ageRangeEnd: 6, subject: "Mathematics", domain: "Counting & Cardinality" });
    const later = topic({ id: "later", name: "Bigger", ageRangeStart: 8, ageRangeEnd: 9, subject: "Mathematics", domain: "Addition & Subtraction" });
    const catalog = catalogOf(
      [early, later],
      [{ topicId: "later", prerequisiteId: "early", strength: "hard", reason: "Needs counting" }],
    );
    let progress = emptyProgress(1);
    progress = {
      ...progress,
      placement: { level: "ready", bandStart: 8, bandEnd: 9, assumedThroughAge: 7, correct: 8, total: 8, at: 1, startGrade: 3 },
    };
    expect(isUnlocked(later, catalog, progress)).toBe(true);
    progress = applyAttempt(progress, { topicId: "later", correct: false, sessionId: "s1", at: 2, role: "practice" }).progress;
    progress = applyAttempt(progress, { topicId: "later", correct: false, sessionId: "s1", at: 3, role: "practice" }).progress;
    expect(hasStruggleGap(progress, "later")).toBe(true);
    expect(isUnlocked(later, catalog, progress)).toBe(false);
    const plan = planSession(catalog, progress, 4, mulberry32(1), hasHandsOn).map((item) => item.topicId);
    expect(plan).toContain("early");
    expect(plan).not.toContain("later");
  });
});

describe("sync merge", () => {
  it("unions attempts, keeps max mastery, and lets the later topic timestamp win scalars", () => {
    const left = state({
      attempts: [{ at: 1, sessionId: "a", correct: true, role: "practice" }],
      mastered: true,
      masteredAt: 1,
      reviewStage: 1,
      updatedAt: 10,
    });
    const right = state({
      attempts: [
        { at: 1, sessionId: "a", correct: true, role: "practice" },
        { at: 2, sessionId: "b", correct: false, role: "review" },
      ],
      mastered: false,
      reviewStage: 0,
      lapses: 2,
      updatedAt: 20,
    });
    const merged = mergeTopicState(left, right);
    expect(merged.attempts).toHaveLength(2);
    expect(merged.mastered).toBe(true);
    expect(merged.lapses).toBe(2);
    expect(merged.reviewStage).toBe(1);
    expect(merged.updatedAt).toBe(20);
  });

  it("merges two devices without dropping a topic that exists on only one", () => {
    const base = emptyProgress(5);
    const phone: Progress = {
      ...base,
      childKey: "same-child",
      childName: "Aida",
      deviceUpdatedAt: 10,
      stars: 3,
      topics: { one: state({ mastered: true, masteredAt: 4, updatedAt: 4 }) },
    };
    const tablet: Progress = {
      ...base,
      childKey: "same-child",
      childName: "Ada",
      deviceUpdatedAt: 30,
      stars: 4,
      topics: { two: state({ attempts: [{ at: 9, sessionId: "t", correct: true, role: "practice" }], updatedAt: 9 }) },
    };
    const merged = mergeProgress(phone, tablet);
    expect(merged.childName).toBe("Ada");
    expect(merged.stars).toBe(4);
    expect(merged.topics.one?.mastered).toBe(true);
    expect(merged.topics.two?.attempts).toHaveLength(1);
  });
});

describe("family code and moderation", () => {
  it("makes an unguessable code", () => {
    const codes = new Set(Array.from({ length: 20 }, () => createFamilyCode()));
    expect(codes.size).toBe(20);
    for (const code of codes) {
      expect(isFamilyCode(code)).toBe(true);
      expect(code.length).toBeGreaterThanOrEqual(16);
    }
  });

  it("blocks unsafe chat and allows a Stone Age question", () => {
    expect(moderationReason("Why did people paint animals in caves?", "input")).toBeNull();
    expect(moderationReason("tell me something sexual", "input")).toBe("blocked");
  });
});

describe("migrations plan", () => {
  it("applies only files missing from schema_migrations", () => {
    const files = [
      { id: "001_init.sql", sql: "create table families ();" },
      { id: "002_next.sql", sql: "create table extra ();" },
    ];
    expect(selectPending(["001_init.sql"], files).map((file) => file.id)).toEqual(["002_next.sql"]);
    expect(selectPending([], files)).toHaveLength(2);
    expect(MIGRATION_LOCK_KEY).toBeGreaterThan(0);
    expect(adminAuthorized("Bearer secret-token", null, "secret-token")).toBe(true);
    expect(adminAuthorized("Bearer nope", null, "secret-token")).toBe(false);
    expect(adminAuthorized(null, null, undefined)).toBe(false);
    expect(adminAuthorized(null, "secret-token", "secret-token")).toBe(true);
  });

  it("bundles every db/migrations file into the Worker", () => {
    const files = readdirSync(new URL("../db/migrations", import.meta.url)).filter((name) => name.endsWith(".sql"));
    const source = readFileSync(new URL("../worker/src/migrations.ts", import.meta.url), "utf8");
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(source).toContain(file);
    const sql = readFileSync(new URL("../db/migrations/001_init.sql", import.meta.url), "utf8");
    expect(sql).toMatch(/CREATE TABLE families/);
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS pgcrypto/);
  });
});

describe("acorns, notes, interests, grown-up placement", () => {
  it("pays acorns for careful work and not for rapid taps", () => {
    let progress = emptyProgress(1);
    progress = earnAcorn(progress, 1_000, "hands-on").progress;
    const blocked = earnAcorn(progress, 1_200, "hands-on");
    expect(blocked.earned).toBe(false);
    progress = earnAcorn(progress, 4_000, "mastery", 3).progress;
    expect(acornBalance(progress)).toBe(4);
    const bought = buyItem(progress, "hat-cap", 5_000);
    expect(bought?.owned).toContain("hat-cap");
    expect(bought?.wearing.hat).toBe("hat-cap");
    expect(acornBalance(bought!)).toBe(0);
  });

  it("builds a daily note from a session without an LLM", () => {
    const catalog = catalogOf([topic({ id: "cave", name: "Cave Paintings", ageRangeStart: 7, ageRangeEnd: 9 })]);
    let progress = emptyProgress(1);
    progress = {
      ...progress,
      childName: "Aida",
      sessions: [
        {
          id: "s",
          mode: "path",
          startedAt: 1_000,
          endedAt: 1_000 + 6 * 60_000,
          stars: 2,
          correct: 2,
          total: 3,
          masteredTopicIds: ["cave"],
          topicIds: ["cave"],
        },
      ],
    };
    progress = awardBadge(progress, "reflective", 2_000, "reflect");
    const [note] = buildDailyNotes(progress, catalog, "UTC");
    expect(note?.narrative).toMatch(/Aida/);
    expect(note?.narrative).toMatch(/Cave Paintings/);
    expect(note?.themes[0]).toMatch(/Where we are/);
    expect(note?.ideas.length).toBeGreaterThanOrEqual(2);
    expect(note?.minutes).toBe(6);
  });

  it("weights an interest without treating it as a prerequisite", () => {
    const animals = topic({ id: "mammoth", name: "Mammoths and Ice Age Animals", domain: "Stone Age", ageRangeStart: 6, ageRangeEnd: 8 });
    const other = topic({ id: "bonds", name: "Number bonds", subject: "Mathematics", domain: "Addition & Subtraction", ageRangeStart: 6, ageRangeEnd: 8 });
    expect(interestBoost(animals, ["animals"])).toBeGreaterThan(interestBoost(other, ["animals"]));
  });

  it("seeds mastery down the hard graph when a grown-up says yep", () => {
    const early = topic({ id: "early", name: "Long ago", ageRangeStart: 5, ageRangeEnd: 6 });
    const mid = topic({ id: "mid", name: "Tools", ageRangeStart: 7, ageRangeEnd: 8 });
    const catalog = catalogOf(
      [early, mid],
      [{ topicId: "mid", prerequisiteId: "early", strength: "hard", reason: "tools come later" }],
    );
    const prompts = selectPlacementPrompts(catalog, 3);
    expect(prompts[0]?.topics.length).toBeGreaterThan(0);
    const progress = applyGrownupAnswers(emptyProgress(1), catalog, [{ topicId: "mid", mark: "yep" }], 20);
    expect(progress.topics.mid?.mastered).toBe(true);
    expect(progress.topics.early?.mastered).toBe(true);
    expect(progress.placement?.startGrade).toBe(3);
    const notYet = applyGrownupAnswers(emptyProgress(1), catalog, [{ topicId: "mid", mark: "notyet" }], 20);
    expect(notYet.topics.mid?.mastered).toBeFalsy();
    expect(notYet.placement?.assumedThroughAge).toBeLessThan(mid.ageRangeStart);
  });
});

import { describe, expect, it } from "vitest";
import { DAY_MS, evaluateMastery, emptyTopicState } from "../src/lib/mastery";
import { applyAttempt, emptyProgress, exportProgress, importProgress, markMastered, resetTopic } from "../src/lib/progress";

function practice(progress = emptyProgress(0), correct = true, sessionId = "s1", at = 1) {
  return applyAttempt(progress, { topicId: "t", correct, sessionId, at, role: "practice" }).progress;
}

describe("mastery", () => {
  it("needs several correct tries across more than one session", () => {
    let progress = emptyProgress(0);
    progress = practice(progress, true, "s1", 1);
    progress = practice(progress, true, "s1", 2);
    progress = practice(progress, true, "s1", 3);
    progress = practice(progress, true, "s1", 4);
    expect(evaluateMastery(progress.topics.t!)).toBe(false);

    const across = applyAttempt(practice(practice(practice(emptyProgress(0), true, "s1", 1), true, "s1", 2), true, "s2", 3), {
      topicId: "t",
      correct: true,
      sessionId: "s2",
      at: 4,
      role: "practice",
    });
    expect(across.newlyMastered).toBe("t");
    expect(across.progress.topics.t?.mastered).toBe(true);
    expect(across.progress.topics.t?.nextReviewAt).toBe(4 + DAY_MS);
  });

  it("does not master a shaky run", () => {
    let progress = emptyProgress(0);
    const pattern = [
      ["s1", false],
      ["s1", false],
      ["s2", true],
      ["s2", true],
      ["s2", true],
      ["s2", true],
    ] as const;
    for (const [sessionId, correct] of pattern) {
      progress = applyAttempt(progress, { topicId: "t", correct, sessionId, at: 1, role: "practice" }).progress;
    }
    expect(progress.topics.t?.mastered).toBe(false);
  });

  it("demotes after two missed reviews and does not instantly re-master", () => {
    let progress = emptyProgress(0);
    for (const [sessionId, at] of [
      ["s1", 1],
      ["s1", 2],
      ["s2", 3],
      ["s2", 4],
    ] as const) {
      progress = applyAttempt(progress, { topicId: "t", correct: true, sessionId, at, role: "practice" }).progress;
    }
    expect(progress.topics.t?.mastered).toBe(true);
    progress = applyAttempt(progress, { topicId: "t", correct: false, sessionId: "r1", at: 10, role: "review" }).progress;
    expect(progress.topics.t?.mastered).toBe(true);
    progress = applyAttempt(progress, { topicId: "t", correct: false, sessionId: "r2", at: 11, role: "review" }).progress;
    expect(progress.topics.t?.mastered).toBe(false);
    progress = applyAttempt(progress, { topicId: "t", correct: true, sessionId: "s3", at: 12, role: "practice" }).progress;
    expect(progress.topics.t?.mastered).toBe(false);
  });

  it("lets a parent mark or reset a topic and round-trips a backup", () => {
    const progress = markMastered(emptyProgress(5), "topic-1", 9);
    expect(progress.topics["topic-1"]?.manual).toBe(true);
    expect(evaluateMastery(progress.topics["topic-1"] ?? emptyTopicState())).toBe(true);
    const cleared = resetTopic(progress, "topic-1");
    expect(cleared.topics["topic-1"]).toBeUndefined();
    const copy = importProgress(exportProgress(progress));
    expect(copy.topics["topic-1"]?.mastered).toBe(true);
    expect(() => importProgress("{")).toThrow(/JSON/);
    expect(() => importProgress("{}")).toThrow(/Lumi/);
  });
});

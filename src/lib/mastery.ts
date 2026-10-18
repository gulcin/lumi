import type { TopicState } from "./types";

/** Correct attempts required inside the scoring window. */
export const MASTERY_CORRECT = 4;
/** Distinct sessions those correct attempts must span. */
export const MASTERY_SESSIONS = 2;
export const MASTERY_WINDOW = 6;
export const MASTERY_ACCURACY = 0.75;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 21, 45];

export function emptyTopicState(): TopicState {
  return {
    attempts: [],
    mastered: false,
    reviewStage: 0,
    lapses: 0,
    attemptFloor: 0,
  };
}

export function scoringAttempts(state: TopicState) {
  return state.attempts.slice(state.attemptFloor);
}

/**
 * Mastery means several correct tries, mostly right, across more than one session.
 * A single sitting is not enough, so a lucky streak cannot close a skill.
 */
export function evaluateMastery(state: TopicState): boolean {
  if (state.manual && state.mastered) return true;
  const attempts = scoringAttempts(state);
  if (attempts.length < MASTERY_CORRECT) return false;
  const window = attempts.slice(-MASTERY_WINDOW);
  const correctOnes = window.filter((a) => a.correct);
  if (correctOnes.length < MASTERY_CORRECT) return false;
  if (correctOnes.length / window.length < MASTERY_ACCURACY) return false;
  const sessions = new Set(correctOnes.map((a) => a.sessionId));
  return sessions.size >= MASTERY_SESSIONS;
}

export function reviewDelayMs(stage: number): number {
  const days = REVIEW_INTERVALS_DAYS[Math.min(stage, REVIEW_INTERVALS_DAYS.length - 1)] ?? 45;
  return days * DAY_MS;
}

export function isReviewDue(state: TopicState | undefined, now: number): boolean {
  if (!state?.mastered || state.nextReviewAt == null) return false;
  return state.nextReviewAt <= now;
}

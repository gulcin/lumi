import { evaluateMastery, emptyTopicState, reviewDelayMs, HOUR_MS } from "./mastery";
import { clampGrade, DEFAULT_START_GRADE } from "./placement";
import type { ActiveSession, Attempt, Progress, SessionRecord, TopicState } from "./types";

export const STORAGE_KEY = "lumi.progress.v1";

function newChildKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `child_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyProgress(now = Date.now()): Progress {
  return {
    version: 1,
    childName: "friend",
    childKey: newChildKey(),
    named: false,
    speechOn: true,
    soundOn: true,
    stars: 0,
    startGrade: DEFAULT_START_GRADE,
    topics: {},
    sessions: [],
    createdAt: now,
    deviceUpdatedAt: now,
    badges: {},
    badgeLog: [],
    interests: [],
    acornEvents: [],
    owned: [],
    wearing: {},
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function normalizeProgress(value: unknown): Progress {
  if (!value || typeof value !== "object") throw new Error("empty");
  const record = value as Partial<Progress>;
  if (record.version !== 1 || typeof record.childName !== "string" || !record.topics || typeof record.topics !== "object") {
    throw new Error("invalid");
  }
  const createdAt = typeof record.createdAt === "number" ? record.createdAt : Date.now();
  const base = emptyProgress(createdAt);
  return {
    ...base,
    ...record,
    version: 1,
    childName: record.childName.slice(0, 24),
    childKey: typeof record.childKey === "string" && record.childKey.length > 8 ? record.childKey.slice(0, 80) : base.childKey,
    named: Boolean(record.named),
    speechOn: record.speechOn !== false,
    soundOn: record.soundOn !== false,
    stars: typeof record.stars === "number" ? record.stars : 0,
    startGrade: clampGrade(record.startGrade),
    topics: record.topics as Progress["topics"],
    sessions: Array.isArray(record.sessions) ? record.sessions.slice(0, 40) : [],
    deviceUpdatedAt: typeof record.deviceUpdatedAt === "number" ? record.deviceUpdatedAt : createdAt,
    badges: record.badges && typeof record.badges === "object" ? record.badges : {},
    badgeLog: Array.isArray(record.badgeLog) ? record.badgeLog.slice(-200) : [],
    interests: Array.isArray(record.interests) ? record.interests.filter((item) => typeof item === "string").slice(0, 12) : [],
    acornEvents: Array.isArray(record.acornEvents) ? record.acornEvents.slice(-500) : [],
    owned: Array.isArray(record.owned) ? record.owned.filter((item) => typeof item === "string") : [],
    wearing: record.wearing && typeof record.wearing === "object" ? record.wearing : {},
  };
}

export function exportProgress(progress: Progress): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(text: string): Progress {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not JSON.");
  }
  try {
    return normalizeProgress(parsed);
  } catch {
    throw new Error("That file is not a Lumi backup.");
  }
}

export function newSessionId(now: number, rng: () => number): string {
  return `s_${now.toString(36)}_${Math.floor(rng() * 1e6).toString(36)}`;
}

export function applyAttempt(
  progress: Progress,
  input: { topicId: string; correct: boolean; sessionId: string; at: number; role: Attempt["role"] },
): { progress: Progress; newlyMastered: string | null } {
  const prev = progress.topics[input.topicId] ?? emptyTopicState();
  const wasMastered = prev.mastered;
  const attempt: Attempt = {
    at: input.at,
    sessionId: input.sessionId,
    correct: input.correct,
    role: input.role,
  };
  let next: TopicState = { ...prev, attempts: [...prev.attempts, attempt], updatedAt: input.at };

  if (wasMastered && input.role === "review") {
    if (input.correct) {
      const reviewStage = next.reviewStage + 1;
      next = {
        ...next,
        reviewStage,
        lapses: 0,
        nextReviewAt: input.at + reviewDelayMs(reviewStage),
      };
    } else {
      const lapses = next.lapses + 1;
      if (lapses >= 2 && !next.manual) {
        next = {
          ...next,
          mastered: false,
          lapses,
          reviewStage: 0,
          nextReviewAt: undefined,
          attemptFloor: next.attempts.length,
        };
      } else {
        next = { ...next, lapses, nextReviewAt: input.at + 12 * HOUR_MS };
      }
    }
  }

  let newlyMastered: string | null = null;
  if (!next.mastered && evaluateMastery(next)) {
    next = {
      ...next,
      mastered: true,
      masteredAt: input.at,
      reviewStage: 0,
      lapses: 0,
      nextReviewAt: input.at + reviewDelayMs(0),
    };
    newlyMastered = input.topicId;
  }

  return {
    progress: {
      ...progress,
      stars: progress.stars + (input.correct ? 1 : 0) + (newlyMastered ? 3 : 0),
      topics: { ...progress.topics, [input.topicId]: next },
    },
    newlyMastered,
  };
}

export function markMastered(progress: Progress, topicId: string, now: number): Progress {
  const prev = progress.topics[topicId] ?? emptyTopicState();
  const next: TopicState = {
    ...prev,
    mastered: true,
    manual: true,
    masteredAt: now,
    reviewStage: 0,
    lapses: 0,
    nextReviewAt: now + reviewDelayMs(0),
    updatedAt: now,
  };
  return { ...progress, topics: { ...progress.topics, [topicId]: next } };
}

export function resetTopic(progress: Progress, topicId: string): Progress {
  const topics = { ...progress.topics };
  delete topics[topicId];
  return { ...progress, topics };
}

export function finishSession(progress: Progress, now: number): { progress: Progress; record: SessionRecord | null } {
  const active = progress.active;
  if (!active) return { progress, record: null };
  const record: SessionRecord = {
    id: active.id,
    mode: active.mode,
    startedAt: active.startedAt,
    endedAt: now,
    stars: active.stars,
    correct: active.correct,
    total: active.items.length,
    masteredTopicIds: active.newlyMastered,
    topicIds: [...new Set(active.items.map((item) => item.topicId))],
  };
  const sessions = [record, ...progress.sessions].slice(0, 40);
  return { progress: { ...progress, active: undefined, sessions }, record };
}

export function patchActive(progress: Progress, active: ActiveSession | undefined): Progress {
  return { ...progress, active };
}

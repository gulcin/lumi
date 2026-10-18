import { clampGrade } from "./placement";
import type { AcornEvent, BadgeEvent, Progress, SessionRecord, TopicState } from "./types";

/** Shape check used by the Worker. Does not touch browser storage. */
export function coerceProgress(value: unknown, childKey: string, nickname: string): Progress | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<Progress>;
  if (record.version !== 1 || !record.topics || typeof record.topics !== "object") return null;
  const now = Date.now();
  const createdAt = typeof record.createdAt === "number" ? record.createdAt : now;
  return {
    version: 1,
    childName: nickname.slice(0, 24) || "friend",
    childKey,
    named: Boolean(record.named),
    speechOn: record.speechOn !== false,
    soundOn: record.soundOn !== false,
    stars: typeof record.stars === "number" ? record.stars : 0,
    startGrade: clampGrade(record.startGrade),
    placement: record.placement,
    topics: record.topics,
    sessions: Array.isArray(record.sessions) ? record.sessions.slice(0, 40) : [],
    active: record.active,
    createdAt,
    deviceUpdatedAt: typeof record.deviceUpdatedAt === "number" ? record.deviceUpdatedAt : createdAt,
    badges: record.badges && typeof record.badges === "object" ? record.badges : {},
    badgeLog: Array.isArray(record.badgeLog) ? record.badgeLog.slice(-200) : [],
    interests: Array.isArray(record.interests) ? record.interests.filter((item) => typeof item === "string").slice(0, 12) : [],
    acornEvents: Array.isArray(record.acornEvents) ? record.acornEvents.slice(-500) : [],
    lastAcornAt: typeof record.lastAcornAt === "number" ? record.lastAcornAt : undefined,
    owned: Array.isArray(record.owned) ? record.owned.filter((item) => typeof item === "string") : [],
    wearing: record.wearing && typeof record.wearing === "object" ? record.wearing : {},
  };
}

function attemptKey(attempt: TopicState["attempts"][number]): string {
  return `${attempt.at}|${attempt.sessionId}|${attempt.correct ? 1 : 0}|${attempt.role}`;
}

function unionAttempts(a: TopicState, b: TopicState): TopicState["attempts"] {
  const map = new Map<string, TopicState["attempts"][number]>();
  for (const attempt of [...a.attempts, ...b.attempts]) map.set(attemptKey(attempt), attempt);
  return [...map.values()].sort((left, right) => left.at - right.at || left.sessionId.localeCompare(right.sessionId));
}

function floorTime(state: TopicState): number {
  if (!state.attemptFloor) return 0;
  return state.attempts[Math.min(state.attemptFloor, state.attempts.length) - 1]?.at ?? 0;
}

export function mergeTopicState(a: TopicState, b: TopicState): TopicState {
  const attempts = unionAttempts(a, b);
  const floorAt = Math.max(floorTime(a), floorTime(b));
  const attemptFloor = floorAt === 0 ? 0 : attempts.filter((attempt) => attempt.at <= floorAt).length;
  const newer = (a.updatedAt ?? 0) >= (b.updatedAt ?? 0) ? a : b;
  const mastered = Boolean(a.mastered || b.mastered);
  const masteredAt = [a.masteredAt, b.masteredAt].filter((value): value is number => typeof value === "number");
  return {
    attempts,
    mastered,
    masteredAt: mastered ? Math.min(...(masteredAt.length ? masteredAt : [newer.updatedAt ?? 0])) : undefined,
    manual: Boolean(a.manual || b.manual),
    reviewStage: Math.max(a.reviewStage, b.reviewStage),
    nextReviewAt: Math.max(a.nextReviewAt ?? 0, b.nextReviewAt ?? 0) || undefined,
    lapses: newer.lapses,
    attemptFloor,
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0) || undefined,
  };
}

function mergeSessions(a: SessionRecord[], b: SessionRecord[]): SessionRecord[] {
  const map = new Map<string, SessionRecord>();
  for (const session of [...a, ...b]) {
    const prev = map.get(session.id);
    if (!prev || session.endedAt >= prev.endedAt) map.set(session.id, session);
  }
  return [...map.values()].sort((left, right) => right.endedAt - left.endedAt).slice(0, 40);
}

function mergeBadgeLog(a: BadgeEvent[], b: BadgeEvent[]): BadgeEvent[] {
  const map = new Map<string, BadgeEvent>();
  for (const event of [...a, ...b]) map.set(`${event.trait}|${event.at}|${event.reason}`, event);
  return [...map.values()].sort((left, right) => left.at - right.at).slice(-200);
}

function mergeAcorns(a: AcornEvent[], b: AcornEvent[]): AcornEvent[] {
  const map = new Map<string, AcornEvent>();
  for (const event of [...a, ...b]) map.set(event.id, event);
  return [...map.values()].sort((left, right) => left.at - right.at).slice(-500);
}

function badgesFromLog(log: BadgeEvent[]): Progress["badges"] {
  const badges: Progress["badges"] = {};
  for (const event of log) {
    const prev = badges[event.trait];
    badges[event.trait] = { count: (prev?.count ?? 0) + 1, lastAt: Math.max(prev?.lastAt ?? 0, event.at) };
  }
  return badges;
}

/**
 * Merge two progress documents.
 * Topic attempts are a union. Mastery is kept if either side has it.
 * Scalar topic fields follow the later per-topic timestamp.
 * Name, grade, speech, and outfit follow the later device timestamp.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const prefer = (a.deviceUpdatedAt ?? 0) >= (b.deviceUpdatedAt ?? 0) ? a : b;
  const topics: Progress["topics"] = {};
  for (const id of new Set([...Object.keys(a.topics), ...Object.keys(b.topics)])) {
    const left = a.topics[id];
    const right = b.topics[id];
    if (left && right) topics[id] = mergeTopicState(left, right);
    else if (left) topics[id] = left;
    else if (right) topics[id] = right;
  }
  const badgeLog = mergeBadgeLog(a.badgeLog ?? [], b.badgeLog ?? []);
  const placement = !a.placement ? b.placement : !b.placement ? a.placement : a.placement.at >= b.placement.at ? a.placement : b.placement;
  return {
    ...prefer,
    version: 1,
    childName: prefer.childName.slice(0, 24),
    childKey: prefer.childKey,
    stars: Math.max(a.stars, b.stars),
    startGrade: prefer.startGrade,
    placement,
    topics,
    sessions: mergeSessions(a.sessions ?? [], b.sessions ?? []),
    deviceUpdatedAt: Math.max(a.deviceUpdatedAt ?? 0, b.deviceUpdatedAt ?? 0),
    badges: badgesFromLog(badgeLog),
    badgeLog,
    interests: [...new Set([...(a.interests ?? []), ...(b.interests ?? [])])].slice(0, 12),
    acornEvents: mergeAcorns(a.acornEvents ?? [], b.acornEvents ?? []),
    lastAcornAt: Math.max(a.lastAcornAt ?? 0, b.lastAcornAt ?? 0) || undefined,
    owned: [...new Set([...(a.owned ?? []), ...(b.owned ?? [])])],
    wearing: prefer.wearing ?? {},
    active: prefer.active,
    speechOn: prefer.speechOn,
    soundOn: prefer.soundOn,
    named: prefer.named || a.named || b.named,
  };
}

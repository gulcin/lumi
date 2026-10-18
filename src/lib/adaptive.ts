import type { Catalog, Edge, Placement, PlannedItem, Progress, Topic, TopicState, TopicStatus } from "./types";
import { interestBoost } from "./interests";
import { isReviewDue } from "./mastery";
import type { Rng } from "./rng";

export type UnlockDetail = {
  topic: Topic;
  ready: boolean;
  hard: { edge: Edge; topic?: Topic; met: boolean }[];
  soft: { edge: Edge; topic?: Topic; met: boolean }[];
  blockedReasons: string[];
  readyBecause: string[];
};

const FOCUS_SIZE = 4;
const SESSION_TARGET = 8;

/** Two or more recent tries, mostly wrong, and not yet mastered. */
export function hasStruggleGap(progress: Progress, topicId: string): boolean {
  const state = progress.topics[topicId];
  if (!state || state.mastered) return false;
  const recent = state.attempts.slice(-4);
  if (recent.length < 2) return false;
  const correct = recent.filter((attempt) => attempt.correct).length;
  return correct / recent.length < 0.5;
}

/** A hard prerequisite that was only assumed by age, pulled back in because a later topic is shaky. */
export function isGapFiller(topic: Topic, catalog: Catalog, progress: Progress): boolean {
  if (progress.topics[topic.id]?.mastered) return false;
  for (const edge of catalog.dependents.get(topic.id) ?? []) {
    if (edge.strength !== "hard") continue;
    if (hasStruggleGap(progress, edge.topicId)) return true;
  }
  return false;
}

export function prereqSatisfied(prereqId: string, catalog: Catalog, progress: Progress, forTopicId?: string): boolean {
  if (progress.topics[prereqId]?.mastered) return true;
  const topic = catalog.byId.get(prereqId);
  if (!topic) return true;
  if (forTopicId && hasStruggleGap(progress, forTopicId)) return false;
  const floor = progress.placement?.assumedThroughAge;
  if (floor != null && topic.ageRangeEnd <= floor) return true;
  return false;
}

export function isAssumedEarlier(topic: Topic, placement: Placement | undefined): boolean {
  if (!placement) return false;
  return topic.ageRangeEnd <= placement.assumedThroughAge;
}

export function isUnlocked(topic: Topic, catalog: Catalog, progress: Progress): boolean {
  const hard = catalog.hardByTopic.get(topic.id) ?? [];
  return hard.every((edge) => prereqSatisfied(edge.prerequisiteId, catalog, progress, topic.id));
}

/** Highest age already in reach. Placement sets it; mastered skills raise it. There is no cap. */
export function frontierEnd(catalog: Catalog, progress: Progress): number {
  let end = progress.placement?.bandEnd ?? 8;
  for (const [id, state] of Object.entries(progress.topics)) {
    if (!state.mastered) continue;
    const topic = catalog.byId.get(id);
    if (topic) end = Math.max(end, topic.ageRangeEnd);
  }
  return end;
}

export function topicStatus(topic: Topic, catalog: Catalog, progress: Progress): TopicStatus {
  const state = progress.topics[topic.id];
  if (state?.mastered) return "mastered";
  if (state && state.attempts.length > 0) return "practicing";
  if (isAssumedEarlier(topic, progress.placement)) return "earlier";
  if (isUnlocked(topic, catalog, progress)) return "ready";
  return "later";
}

function inProgress(topic: Topic, progress: Progress): boolean {
  const state = progress.topics[topic.id];
  return Boolean(state && !state.mastered && state.attempts.length > 0);
}

export function scoreTopic(
  topic: Topic,
  catalog: Catalog,
  progress: Progress,
  hasHandsOn: (topic: Topic) => boolean,
  frontier: number,
  rng: Rng,
): number {
  let score = hasHandsOn(topic) ? 40 : -8;
  const soft = catalog.softByTopic.get(topic.id) ?? [];
  if (soft.length) {
    const met = soft.filter((edge) => prereqSatisfied(edge.prerequisiteId, catalog, progress)).length;
    score += (met / soft.length) * 24;
  } else {
    score += 6;
  }
  score -= Math.abs(topic.ageRangeStart - (frontier - 1)) * 2.5;
  if (topic.ageRangeStart > frontier) score -= (topic.ageRangeStart - frontier) * 6;
  score += interestBoost(topic, progress.interests);
  score += rng() * 3;
  return score;
}

function practicePool(catalog: Catalog, progress: Progress, frontier: number, extraYears: number): Topic[] {
  const ceiling = frontier + extraYears;
  const pool: Topic[] = [];
  for (const topic of catalog.topics) {
    const state = progress.topics[topic.id];
    if (state?.mastered) continue;
    if (isAssumedEarlier(topic, progress.placement) && !state?.attempts.length && !isGapFiller(topic, catalog, progress)) continue;
    if (!isUnlocked(topic, catalog, progress)) continue;
    if (topic.ageRangeStart > ceiling) continue;
    pool.push(topic);
  }
  return pool;
}

function ranked(
  topics: Topic[],
  catalog: Catalog,
  progress: Progress,
  hasHandsOn: (topic: Topic) => boolean,
  frontier: number,
  rng: Rng,
): Topic[] {
  return topics
    .map((topic) => ({ topic, score: scoreTopic(topic, catalog, progress, hasHandsOn, frontier, rng) }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.topic);
}

function mixSubjects(topics: Topic[], subjects: string[]): Topic[] {
  const queues = new Map<string, Topic[]>();
  for (const subject of subjects) queues.set(subject, []);
  const extras: Topic[] = [];
  for (const topic of topics) {
    const queue = queues.get(topic.subject);
    if (queue) queue.push(topic);
    else extras.push(topic);
  }
  const out: Topic[] = [];
  let moved = true;
  while (moved) {
    moved = false;
    for (const subject of subjects) {
      const next = queues.get(subject)?.shift();
      if (next) {
        out.push(next);
        moved = true;
      }
    }
  }
  return out.concat(extras);
}

function rotate<T>(items: T[], start: number): T[] {
  if (!items.length) return items;
  const i = start % items.length;
  return items.slice(i).concat(items.slice(0, i));
}

export function planSession(
  catalog: Catalog,
  progress: Progress,
  now: number,
  rng: Rng,
  hasHandsOn: (topic: Topic) => boolean,
  themeId?: string,
): PlannedItem[] {
  if (!progress.placement) return [];
  const frontier = frontierEnd(catalog, progress);
  let extra = 1;
  let pool = practicePool(catalog, progress, frontier, extra);
  const maxStart = catalog.topics.reduce((m, t) => Math.max(m, t.ageRangeStart), frontier);
  while (pool.filter(hasHandsOn).length < FOCUS_SIZE && frontier + extra < maxStart) {
    extra += 1;
    pool = practicePool(catalog, progress, frontier, extra);
  }

  const due = catalog.topics
    .filter((topic) => isReviewDue(progress.topics[topic.id], now))
    .sort((a, b) => (progress.topics[a.id]?.nextReviewAt ?? 0) - (progress.topics[b.id]?.nextReviewAt ?? 0));

  const practicing = pool
    .filter((topic) => inProgress(topic, progress))
    .sort((a, b) => {
      const diff = (progress.topics[a.id]?.attempts.length ?? 0) - (progress.topics[b.id]?.attempts.length ?? 0);
      if (diff !== 0) return diff;
      return Number(hasHandsOn(b)) - Number(hasHandsOn(a));
    });

  const fresh = ranked(
    pool.filter((topic) => !inProgress(topic, progress) && !progress.topics[topic.id]?.mastered),
    catalog,
    progress,
    hasHandsOn,
    frontier,
    rng,
  );

  const subjectOrder = rotate(catalog.subjects, Math.floor(rng() * catalog.subjects.length));
  const themed = themeId && catalog.pypMap ? fresh.filter((topic) => catalog.pypMap?.topics[topic.id]?.theme === themeId) : [];
  const mixedFresh = mixSubjects(themed.length >= 2 ? [...themed, ...fresh.filter((topic) => !themed.includes(topic))] : fresh, subjectOrder);

  const focus: { topic: Topic; role: PlannedItem["role"] }[] = [];
  const seen = new Set<string>();
  const push = (topic: Topic, role: PlannedItem["role"]) => {
    if (seen.has(topic.id) || focus.length >= FOCUS_SIZE) return;
    seen.add(topic.id);
    focus.push({ topic, role });
  };

  if (due[0]) push(due[0], "review");
  for (const topic of practicing) push(topic, "practice");

  let fallbacks = focus.filter((item) => !hasHandsOn(item.topic)).length;
  const deferred: Topic[] = [];
  for (const topic of mixedFresh) {
    if (focus.length >= FOCUS_SIZE) break;
    if (!hasHandsOn(topic)) {
      if (fallbacks >= 1) {
        deferred.push(topic);
        continue;
      }
      fallbacks += 1;
    }
    push(topic, "practice");
  }
  for (const topic of deferred) push(topic, "practice");
  for (const topic of due.slice(1)) push(topic, "review");

  return expandFocus(focus, rng, hasHandsOn);
}

function expandFocus(
  focus: { topic: Topic; role: PlannedItem["role"] }[],
  rng: Rng,
  hasHandsOn: (topic: Topic) => boolean,
): PlannedItem[] {
  if (!focus.length) return [];
  const hands = focus.filter((item) => hasHandsOn(item.topic) && item.role !== "review");
  const once = focus.filter((item) => !hasHandsOn(item.topic) || item.role === "review");
  const seq: { topic: Topic; role: PlannedItem["role"] }[] = [];
  const rounds = hands.length ? 2 : 1;
  for (let round = 0; round < rounds; round++) {
    for (const item of hands) seq.push(item);
  }
  for (const item of once) seq.push(item);
  let guard = 0;
  while (seq.length < Math.min(SESSION_TARGET, Math.max(6, hands.length * 2)) && hands.length && guard < 20) {
    seq.push(hands[guard % hands.length]!);
    guard += 1;
  }
  return seq.slice(0, SESSION_TARGET).map((item) => ({
    topicId: item.topic.id,
    role: item.role,
    seed: Math.floor(rng() * 1_000_000_000),
  }));
}

export function planTopicPractice(
  topic: Topic,
  rng: Rng,
  hasHandsOn: (topic: Topic) => boolean,
): PlannedItem[] {
  const count = hasHandsOn(topic) ? 4 : 1;
  return Array.from({ length: count }, () => ({
    topicId: topic.id,
    role: "explore" as const,
    seed: Math.floor(rng() * 1_000_000_000),
  }));
}

export function explainTopic(topic: Topic, catalog: Catalog, progress: Progress): UnlockDetail {
  const hardEdges = catalog.hardByTopic.get(topic.id) ?? [];
  const softEdges = catalog.softByTopic.get(topic.id) ?? [];
  const hard = hardEdges.map((edge) => ({
    edge,
    topic: catalog.byId.get(edge.prerequisiteId),
    met: prereqSatisfied(edge.prerequisiteId, catalog, progress, topic.id),
  }));
  const soft = softEdges.map((edge) => ({
    edge,
    topic: catalog.byId.get(edge.prerequisiteId),
    met: prereqSatisfied(edge.prerequisiteId, catalog, progress, topic.id),
  }));
  const blockedReasons = hard
    .filter((item) => !item.met)
    .map((item) => {
      const name = item.topic?.name ?? "an earlier lesson";
      return `${name}: ${item.edge.reason}`;
    });
  const ready = blockedReasons.length === 0;
  const readyBecause: string[] = [];
  if (ready) {
    const metHard = hard.filter((item) => item.met && item.topic);
    if (metHard.length) {
      readyBecause.push(
        `Hard steps already in place: ${metHard
          .slice(0, 3)
          .map((item) => item.topic!.name)
          .join(", ")}.`,
      );
    } else {
      readyBecause.push("No hard prerequisites. This can be a starting lesson.");
    }
    const metSoft = soft.filter((item) => item.met && item.topic);
    const unmetSoft = soft.filter((item) => !item.met && item.topic);
    if (metSoft.length) {
      readyBecause.push(`Helpful earlier skills are in place: ${metSoft.slice(0, 2).map((item) => item.topic!.name).join(", ")}.`);
    }
    if (unmetSoft.length) {
      readyBecause.push(
        `Soft preference still open: ${unmetSoft
          .slice(0, 2)
          .map((item) => `${item.topic!.name} (${item.edge.reason})`)
          .join("; ")}.`,
      );
    }
  }
  return { topic, ready, hard, soft, blockedReasons, readyBecause };
}

export function whatsNext(catalog: Catalog, progress: Progress, hasHandsOn: (topic: Topic) => boolean, limit = 6): UnlockDetail[] {
  if (!progress.placement) return [];
  const frontier = frontierEnd(catalog, progress);
  const pool = practicePool(catalog, progress, frontier, 1).filter((topic) => !progress.topics[topic.id]?.mastered);
  const ordered = ranked(pool, catalog, progress, hasHandsOn, frontier, () => 0);
  return ordered.slice(0, limit).map((topic) => explainTopic(topic, catalog, progress));
}

export function upcomingLocked(catalog: Catalog, progress: Progress, limit = 5): UnlockDetail[] {
  if (!progress.placement) return [];
  const frontier = frontierEnd(catalog, progress);
  const locked = catalog.topics.filter((topic) => {
    if (progress.topics[topic.id]?.mastered) return false;
    if (isAssumedEarlier(topic, progress.placement)) return false;
    if (topic.ageRangeStart > frontier + 2) return false;
    return !isUnlocked(topic, catalog, progress);
  });
  locked.sort((a, b) => a.ageRangeStart - b.ageRangeStart || a.name.localeCompare(b.name));
  return locked.slice(0, limit).map((topic) => explainTopic(topic, catalog, progress));
}

export function subjectTallies(catalog: Catalog, progress: Progress): { subject: string; total: number; mastered: number; practicing: number; ready: number }[] {
  const rows = new Map<string, { subject: string; total: number; mastered: number; practicing: number; ready: number }>();
  for (const subject of catalog.subjects) {
    rows.set(subject, { subject, total: 0, mastered: 0, practicing: 0, ready: 0 });
  }
  for (const topic of catalog.topics) {
    const row = rows.get(topic.subject);
    if (!row) continue;
    row.total += 1;
    const status = topicStatus(topic, catalog, progress);
    if (status === "mastered") row.mastered += 1;
    else if (status === "practicing") row.practicing += 1;
    else if (status === "ready") row.ready += 1;
  }
  return [...rows.values()];
}

export function attemptCount(state: TopicState | undefined): number {
  return state?.attempts.length ?? 0;
}

export type JourneyState = "mastered" | "working" | "coming";

export const JOURNEY_LABEL: Record<JourneyState, string> = {
  mastered: "Mastered",
  working: "Lumi's working on",
  coming: "Coming up",
};

/** Three states for the child map: already in place, on the frontier, or later. */
export function journeyState(topic: Topic, catalog: Catalog, progress: Progress): JourneyState {
  const status = topicStatus(topic, catalog, progress);
  if (status === "mastered" || status === "earlier") return "mastered";
  if (status === "practicing" || isGapFiller(topic, catalog, progress)) return "working";
  if (status === "ready" && progress.placement && topic.ageRangeStart <= frontierEnd(catalog, progress) + 1) return "working";
  return "coming";
}

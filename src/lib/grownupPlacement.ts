import type { Catalog, Progress, Topic } from "./types";
import { clampGrade, gradeAnchorAge, placementFromScore } from "./placement";
import { markMastered } from "./progress";

export type GrownupMark = "yep" | "getting" | "notyet";

export type GrownupAnswer = { topicId: string; mark: GrownupMark };

/** Three topics per subject, near the grade's age, spread across domains. */
export function selectPlacementPrompts(catalog: Catalog, grade: number): { subject: string; topics: Topic[] }[] {
  const anchor = gradeAnchorAge(grade);
  const rows = catalog.subjects.map((subject) => {
    const ranked = catalog.topics
      .filter((topic) => topic.subject === subject)
      .sort((a, b) => Math.abs(a.ageRangeStart - anchor) - Math.abs(b.ageRangeStart - anchor) || a.name.localeCompare(b.name));
    const picked: Topic[] = [];
    const domains = new Set<string>();
    for (const topic of ranked) {
      if (picked.length >= 3) break;
      if (domains.has(topic.domain)) continue;
      domains.add(topic.domain);
      picked.push(topic);
    }
    for (const topic of ranked) {
      if (picked.length >= 3) break;
      if (!picked.some((item) => item.id === topic.id)) picked.push(topic);
    }
    return { subject, topics: picked };
  });
  return rows.filter((row) => row.topics.length > 0);
}

function hardAncestors(catalog: Catalog, topicId: string, maxAgeEnd?: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const stack = [topicId];
  while (stack.length) {
    const id = stack.pop();
    if (!id) continue;
    for (const edge of catalog.hardByTopic.get(id) ?? []) {
      if (seen.has(edge.prerequisiteId)) continue;
      const topic = catalog.byId.get(edge.prerequisiteId);
      if (!topic) continue;
      if (maxAgeEnd != null && topic.ageRangeEnd > maxAgeEnd) continue;
      seen.add(edge.prerequisiteId);
      out.push(edge.prerequisiteId);
      stack.push(edge.prerequisiteId);
    }
  }
  return out;
}

/**
 * Yep seeds the topic and its hard prerequisites as mastered.
 * Getting there seeds only older prerequisites, leaving the topic on the frontier.
 * Not yet lowers the starting band so those gaps stay in the path.
 */
export function applyGrownupAnswers(progress: Progress, catalog: Catalog, answers: GrownupAnswer[], now: number): Progress {
  const grade = clampGrade(progress.startGrade);
  let next = { ...progress, startGrade: grade };
  const notYet: number[] = [];
  const getting: number[] = [];
  let yep = 0;
  for (const answer of answers) {
    const topic = catalog.byId.get(answer.topicId);
    if (!topic) continue;
    if (answer.mark === "yep") {
      yep += 1;
      next = markMastered(next, topic.id, now);
      for (const id of hardAncestors(catalog, topic.id)) next = markMastered(next, id, now);
    } else if (answer.mark === "getting") {
      getting.push(topic.ageRangeStart);
      for (const id of hardAncestors(catalog, topic.id, topic.ageRangeStart - 1)) next = markMastered(next, id, now);
    } else {
      notYet.push(topic.ageRangeStart);
    }
  }
  const total = Math.max(1, answers.length);
  let placement = placementFromScore(total, total, now, grade);
  if (notYet.length) {
    const lowest = Math.min(...notYet);
    placement = {
      ...placement,
      level: "emerging",
      bandStart: Math.max(5, lowest),
      bandEnd: Math.max(6, lowest + 1),
      assumedThroughAge: Math.max(4, lowest - 1),
      correct: yep,
      total,
      startGrade: grade,
    };
  } else if (getting.length) {
    const focus = Math.min(...getting);
    placement = {
      ...placement,
      level: "growing",
      bandStart: Math.max(5, focus),
      bandEnd: Math.max(6, focus + 1),
      assumedThroughAge: Math.max(4, focus - 1),
      correct: yep,
      total,
      startGrade: grade,
    };
  } else {
    placement = { ...placement, correct: yep, total, startGrade: grade };
  }
  return { ...next, placement };
}

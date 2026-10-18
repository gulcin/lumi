import type { Catalog, Cluster, Edge, TaxonomyFile, Topic } from "./types";
import { SUBJECT_ORDER } from "./types";

export function buildCatalog(data: TaxonomyFile): Catalog {
  const byId = new Map<string, Topic>();
  const hardByTopic = new Map<string, Edge[]>();
  const softByTopic = new Map<string, Edge[]>();
  const dependents = new Map<string, Edge[]>();
  const domainsBySubject = new Map<string, Set<string>>();

  for (const topic of data.topics) {
    byId.set(topic.id, topic);
    if (!domainsBySubject.has(topic.subject)) domainsBySubject.set(topic.subject, new Set());
    domainsBySubject.get(topic.subject)!.add(topic.domain);
  }

  for (const edge of data.dependencies) {
    const bucket = edge.strength === "hard" ? hardByTopic : softByTopic;
    const list = bucket.get(edge.topicId) ?? [];
    list.push(edge);
    bucket.set(edge.topicId, list);
    const deps = dependents.get(edge.prerequisiteId) ?? [];
    deps.push(edge);
    dependents.set(edge.prerequisiteId, deps);
  }

  const present = new Set(data.topics.map((t) => t.subject));
  const subjects = [
    ...SUBJECT_ORDER.filter((s) => present.has(s)),
    ...[...present].filter((s) => !SUBJECT_ORDER.includes(s as (typeof SUBJECT_ORDER)[number])).sort(),
  ];

  const domainMap = new Map<string, string[]>();
  for (const [subject, domains] of domainsBySubject) {
    domainMap.set(subject, [...domains].sort((a, b) => a.localeCompare(b)));
  }

  return {
    topics: data.topics,
    byId,
    hardByTopic,
    softByTopic,
    dependents,
    clusters: data.clusters,
    attribution: data.attribution,
    additionsAttribution: data.additionsAttribution,
    pypMap: data.pypMap,
    subjects,
    domainsBySubject: domainMap,
  };
}

export function clusterBlurb(catalog: Catalog, topic: Topic): string | undefined {
  const matches = catalog.clusters.filter(
    (c: Cluster) => c.subject === topic.subject && c.domain === topic.domain,
  );
  if (!matches.length) return undefined;
  matches.sort(
    (a, b) =>
      Math.abs(a.ageRangeStart - topic.ageRangeStart) - Math.abs(b.ageRangeStart - topic.ageRangeStart),
  );
  return matches[0]?.summary;
}

export function ageLabel(topic: Topic): string {
  if (topic.ageRangeStart === topic.ageRangeEnd) return `age ${topic.ageRangeStart}`;
  return `ages ${topic.ageRangeStart}–${topic.ageRangeEnd}`;
}

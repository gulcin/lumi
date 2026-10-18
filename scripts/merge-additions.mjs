function slim(topic) {
  return {
    id: topic.id,
    type: topic.type,
    subject: topic.subject,
    domain: topic.domain,
    name: topic.name,
    description: topic.description,
    ageRangeStart: topic.ageRangeStart,
    ageRangeEnd: topic.ageRangeEnd,
    evidence: topic.evidence,
    assessmentPrompt: topic.assessmentPrompt,
    origin: topic.origin ?? (String(topic.id).startsWith("lumi_") ? "lumi" : "marble"),
  };
}

export function mergeAdditions(marbleTopics, marbleDeps, marbleClusters, extra) {
  const topics = marbleTopics.map(slim);
  const seen = new Set(topics.map((topic) => topic.id));
  for (const topic of extra.topics) {
    if (!topic.id?.startsWith("lumi_")) {
      throw new Error(`Lumi addition id must start with lumi_: ${topic.id}`);
    }
    if (seen.has(topic.id)) throw new Error(`Duplicate topic id ${topic.id}`);
    for (const field of ["name", "description", "ageRangeStart", "ageRangeEnd", "evidence", "assessmentPrompt", "type", "subject", "domain"]) {
      if (topic[field] == null || topic[field] === "") throw new Error(`Missing ${field} on ${topic.id}`);
    }
    if (!Array.isArray(topic.evidence) || topic.evidence.length === 0) {
      throw new Error(`Evidence missing on ${topic.id}`);
    }
    seen.add(topic.id);
    topics.push({ ...slim(topic), origin: "lumi" });
  }
  const dependencies = [...marbleDeps];
  const edgeKey = new Set(dependencies.map((edge) => `${edge.topicId}|${edge.prerequisiteId}|${edge.strength}`));
  for (const edge of extra.dependencies) {
    if (!seen.has(edge.topicId) && !marbleTopics.some((topic) => topic.id === edge.topicId)) {
      throw new Error(`Edge topic missing: ${edge.topicId}`);
    }
    if (!seen.has(edge.prerequisiteId)) throw new Error(`Edge prerequisite missing: ${edge.prerequisiteId}`);
    const key = `${edge.topicId}|${edge.prerequisiteId}|${edge.strength}`;
    if (edgeKey.has(key)) throw new Error(`Duplicate edge ${key}`);
    edgeKey.add(key);
    dependencies.push(edge);
  }
  const clusters = [...marbleClusters, ...(extra.clusters ?? [])];
  return { topics, dependencies, clusters };
}

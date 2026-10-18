import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const vendor = path.join(root, "vendor", "marble");
const outDir = path.join(root, "public", "data");
const outFile = path.join(outDir, "taxonomy.json");

const topicsFile = JSON.parse(fs.readFileSync(path.join(vendor, "topics.json"), "utf8"));
const depsFile = JSON.parse(fs.readFileSync(path.join(vendor, "dependencies.json"), "utf8"));
const clustersFile = JSON.parse(fs.readFileSync(path.join(vendor, "clusters.json"), "utf8"));

const topics = topicsFile.topics.map((t) => ({
  id: t.id,
  type: t.type,
  subject: t.subject,
  domain: t.domain,
  name: t.name,
  description: t.description,
  ageRangeStart: t.ageRangeStart,
  ageRangeEnd: t.ageRangeEnd,
  evidence: t.evidence,
  assessmentPrompt: t.assessmentPrompt,
}));

const payload = {
  version: String(topicsFile.version ?? "v1"),
  source: "Marble Skill Taxonomy",
  attribution:
    "Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).",
  topicCount: topics.length,
  topics,
  dependencies: depsFile.dependencies,
  clusters: clustersFile.clusters,
};

if (topics.length !== 1590) {
  console.warn(`Expected 1590 topics, found ${topics.length}. Continuing with the vendored file.`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(payload));
const bytes = fs.statSync(outFile).size;
console.log(
  `Wrote ${path.relative(root, outFile)} (${topics.length} topics, ${payload.dependencies.length} edges, ${payload.clusters.length} clusters, ${bytes} bytes)`,
);

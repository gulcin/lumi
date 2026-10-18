import fs from "node:fs";
import path from "node:path";
import { mergeAdditions } from "./merge-additions.mjs";
import { buildThemeMap, writeThemeMap } from "./pyp-map.mjs";

const root = path.resolve(import.meta.dirname, "..");
const vendor = path.join(root, "vendor", "marble");
const additionsPath = path.join(root, "vendor", "lumi", "additions.json");
const outDir = path.join(root, "public", "data");
const outFile = path.join(outDir, "taxonomy.json");

const topicsFile = JSON.parse(fs.readFileSync(path.join(vendor, "topics.json"), "utf8"));
const depsFile = JSON.parse(fs.readFileSync(path.join(vendor, "dependencies.json"), "utf8"));
const clustersFile = JSON.parse(fs.readFileSync(path.join(vendor, "clusters.json"), "utf8"));
const additions = JSON.parse(fs.readFileSync(additionsPath, "utf8"));

const merged = mergeAdditions(topicsFile.topics, depsFile.dependencies, clustersFile.clusters, additions);
const themeMap = buildThemeMap(merged.topics);
if (themeMap.missing.length) {
  throw new Error(`PYP map is missing ${themeMap.missing.length} topics`);
}
const { missing, ...pypMap } = themeMap;

const marbleCount = topicsFile.topics.length;
const payload = {
  version: String(topicsFile.version ?? "v1"),
  source: "Marble Skill Taxonomy",
  attribution:
    "Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).",
  additionsAttribution: additions.attribution,
  topicCount: merged.topics.length,
  marbleTopicCount: marbleCount,
  topics: merged.topics,
  dependencies: merged.dependencies,
  clusters: merged.clusters,
  pypMap,
};

if (marbleCount !== 1590) {
  console.warn(`Expected 1590 Marble topics, found ${marbleCount}. Continuing with the vendored file.`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(payload));
const written = writeThemeMap(root);
const bytes = fs.statSync(outFile).size;
console.log(
  `Wrote ${path.relative(root, outFile)} (${merged.topics.length} topics, ${marbleCount} from Marble, ${merged.topics.length - marbleCount} Lumi additions, ${payload.dependencies.length} edges, ${payload.clusters.length} clusters, ${bytes} bytes)`,
);
console.log(`Wrote ${path.relative(root, written.file)} (${written.count} mapped topics)`);

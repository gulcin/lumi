import type { Topic } from "../src/lib/types";

export function mergeAdditions(
  marbleTopics: Topic[],
  marbleDeps: { topicId: string; prerequisiteId: string; strength: string; reason: string }[],
  marbleClusters: unknown[],
  extra: {
    topics: Topic[];
    dependencies: { topicId: string; prerequisiteId: string; strength: string; reason: string }[];
  },
): {
  topics: Topic[];
  dependencies: { topicId: string; prerequisiteId: string; strength: string; reason: string }[];
  clusters: unknown[];
};

export type Topic = {
  id: string;
  type: string;
  subject: string;
  domain: string;
  name: string;
  description: string;
  ageRangeStart: number;
  ageRangeEnd: number;
  evidence: string[];
  assessmentPrompt: string;
};

export type Edge = {
  topicId: string;
  prerequisiteId: string;
  strength: "hard" | "soft";
  reason: string;
};

export type Cluster = {
  subject: string;
  domain: string;
  ageRangeStart: number;
  summary: string;
};

export type TaxonomyFile = {
  version: string;
  source: string;
  attribution: string;
  topicCount: number;
  topics: Topic[];
  dependencies: Edge[];
  clusters: Cluster[];
};

export type Catalog = {
  topics: Topic[];
  byId: Map<string, Topic>;
  hardByTopic: Map<string, Edge[]>;
  softByTopic: Map<string, Edge[]>;
  dependents: Map<string, Edge[]>;
  clusters: Cluster[];
  attribution: string;
  subjects: string[];
  domainsBySubject: Map<string, string[]>;
};

export type Attempt = {
  at: number;
  sessionId: string;
  correct: boolean;
  role: "practice" | "review" | "explore";
};

export type TopicState = {
  attempts: Attempt[];
  mastered: boolean;
  masteredAt?: number;
  manual?: boolean;
  reviewStage: number;
  nextReviewAt?: number;
  lapses: number;
  /** Attempts before this index do not count toward mastery (used after a lapse). */
  attemptFloor: number;
};

export type PlacementLevel = "emerging" | "growing" | "ready";

export type Placement = {
  level: PlacementLevel;
  bandStart: number;
  bandEnd: number;
  assumedThroughAge: number;
  correct: number;
  total: number;
  at: number;
};

export type PlannedItem = {
  topicId: string;
  role: "practice" | "review" | "explore";
  seed: number;
};

export type ActiveSession = {
  id: string;
  mode: "path" | "topic";
  topicId?: string;
  startedAt: number;
  items: PlannedItem[];
  index: number;
  correct: number;
  stars: number;
  newlyMastered: string[];
};

export type SessionRecord = {
  id: string;
  mode: "path" | "topic";
  startedAt: number;
  endedAt: number;
  stars: number;
  correct: number;
  total: number;
  masteredTopicIds: string[];
  topicIds: string[];
};

export type Progress = {
  version: 1;
  childName: string;
  named: boolean;
  speechOn: boolean;
  soundOn: boolean;
  stars: number;
  placement?: Placement;
  topics: Record<string, TopicState>;
  sessions: SessionRecord[];
  active?: ActiveSession;
  createdAt: number;
};

export type TopicStatus = "mastered" | "practicing" | "ready" | "later" | "earlier";

export const SUBJECT_ORDER = [
  "Mathematics",
  "English",
  "Science",
  "History",
  "Life Skills",
  "Personal & Social Development",
  "Computing",
  "Learning to Learn",
] as const;

export const ATTRIBUTION =
  "Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).";

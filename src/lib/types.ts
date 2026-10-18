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
  /** marble topics come from the vendored taxonomy. lumi topics are local additions. */
  origin?: "marble" | "lumi";
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

export type PypThemeId =
  | "who-we-are"
  | "where-we-are"
  | "how-we-express"
  | "how-the-world-works"
  | "how-we-organise"
  | "sharing-the-planet";

export type PypArea = "language" | "maths" | "science" | "social studies" | "arts" | "PSPE";

export type PypMap = {
  version: number;
  unofficial: boolean;
  note: string;
  themes: { id: PypThemeId; name: string }[];
  areas: PypArea[];
  topics: Record<string, { theme: PypThemeId; area: PypArea }>;
};

export type TaxonomyFile = {
  version: string;
  source: string;
  attribution: string;
  additionsAttribution?: string;
  topicCount: number;
  marbleTopicCount?: number;
  topics: Topic[];
  dependencies: Edge[];
  clusters: Cluster[];
  pypMap?: PypMap;
};

export type Catalog = {
  topics: Topic[];
  byId: Map<string, Topic>;
  hardByTopic: Map<string, Edge[]>;
  softByTopic: Map<string, Edge[]>;
  dependents: Map<string, Edge[]>;
  clusters: Cluster[];
  attribution: string;
  additionsAttribution?: string;
  subjects: string[];
  domainsBySubject: Map<string, string[]>;
  pypMap?: PypMap;
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
  /** Last local change to this topic, used when merging devices. */
  updatedAt?: number;
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
  /** Grade the warm-up was aimed at. Grade 3 is about age 8. */
  startGrade?: number;
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

export type LearnerTrait =
  | "inquirer"
  | "knowledgeable"
  | "thinker"
  | "communicator"
  | "principled"
  | "open-minded"
  | "caring"
  | "risk-taker"
  | "balanced"
  | "reflective";

export type BadgeState = { count: number; lastAt: number };

export type BadgeEvent = { trait: LearnerTrait; at: number; reason: string };

export type AcornEvent = { id: string; at: number; delta: number; reason: string };

export type Outfit = { hat?: string; scarf?: string; glasses?: string; den?: string };

export type Progress = {
  version: 1;
  childName: string;
  /** Stable id for this child on this family. Not a real-world identifier. */
  childKey: string;
  named: boolean;
  speechOn: boolean;
  soundOn: boolean;
  stars: number;
  /** Grade the path aims at before the warm-up. Default 3. */
  startGrade: number;
  placement?: Placement;
  topics: Record<string, TopicState>;
  sessions: SessionRecord[];
  active?: ActiveSession;
  createdAt: number;
  /** Last local edit of name, settings, outfit, or the active lesson. */
  deviceUpdatedAt: number;
  badges: Partial<Record<LearnerTrait, BadgeState>>;
  badgeLog: BadgeEvent[];
  interests: string[];
  acornEvents: AcornEvent[];
  /** Last time an acorn was earned, so rapid taps do not farm them. */
  lastAcornAt?: number;
  owned: string[];
  wearing: Outfit;
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

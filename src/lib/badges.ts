import type { BadgeEvent, LearnerTrait, Progress } from "./types";

export function awardBadge(progress: Progress, trait: LearnerTrait, at: number, reason: string): Progress {
  const prev = progress.badges[trait];
  const event: BadgeEvent = { trait, at, reason };
  return {
    ...progress,
    badges: {
      ...progress.badges,
      [trait]: { count: (prev?.count ?? 0) + 1, lastAt: at },
    },
    badgeLog: [...progress.badgeLog, event].slice(-200),
  };
}

export function awardBadges(progress: Progress, traits: LearnerTrait[], at: number, reason: string): Progress {
  return traits.reduce((current, trait) => awardBadge(current, trait, at, reason), progress);
}

import { areaName, themeName } from "./pyp";
import type { Catalog, LearnerTrait, Progress, SessionRecord } from "./types";
import type { PypThemeId } from "./types";

export type DayNote = {
  day: string;
  minutes: number;
  topicNames: string[];
  masteredNames: string[];
  themes: string[];
  badges: LearnerTrait[];
  ideas: string[];
  narrative: string;
};

const THEME_IDEAS: Record<PypThemeId, { visit: string; book: string; home: string; dinner: string }> = {
  "who-we-are": {
    visit: "a place where people talk about bodies, food, or feelings, such as a health museum or a quiet library corner",
    book: "a picture book about feelings, families, or how a body works",
    home: "trace a hand and label one thing it can do",
    dinner: "What did you notice about yourself today?",
  },
  "where-we-are": {
    visit: "a museum with objects from long ago, or a walk past an old building",
    book: "a book of pictures from another time or place",
    home: "make a three-step timeline with drawings: long ago, a bit ago, today",
    dinner: "What is one thing that was different when grandparents were children?",
  },
  "how-we-express": {
    visit: "a gallery, a mural, or a library story time",
    book: "a poem or a story you can read aloud together",
    home: "write or draw a tiny story in four boxes",
    dinner: "What is a word you liked today, and why?",
  },
  "how-the-world-works": {
    visit: "a science centre, a bridge, or a kitchen experiment",
    book: "a book that shows how something is made or how a pattern works",
    home: "try a fair test with two cups of water, one in the sun and one in the shade",
    dinner: "What pattern did you spot today?",
  },
  "how-we-organise": {
    visit: "a market, a post office, or a map on a wall",
    book: "a book about a town, a team, or how people share jobs",
    home: "sort coins or buttons into groups and say the rule",
    dinner: "How did someone help a group today?",
  },
  "sharing-the-planet": {
    visit: "a park, a pond, a zoo, or a window that looks onto trees",
    book: "a book about an animal and the place it needs",
    home: "leave a saucer of water for insects or sketch a plant you can see",
    dinner: "What living thing shares our street?",
  },
};

function dayKey(ts: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));
}

function ideasFor(theme: PypThemeId | undefined, topicName: string): string[] {
  const pack = THEME_IDEAS[theme ?? "how-the-world-works"];
  return [
    `Visit ${pack.visit}.`,
    `Read ${pack.book} that touches on ${topicName}.`,
    `At home, ${pack.home}.`,
    `At dinner, ask: ${pack.dinner}`,
  ];
}

export function buildDailyNotes(progress: Progress, catalog: Catalog, timeZone = "UTC"): DayNote[] {
  const name = progress.childName || "Your child";
  const sessionsByDay = new Map<string, SessionRecord[]>();
  for (const session of progress.sessions) {
    const key = dayKey(session.endedAt, timeZone);
    const list = sessionsByDay.get(key) ?? [];
    list.push(session);
    sessionsByDay.set(key, list);
  }
  const days = [...sessionsByDay.keys()].sort((a, b) => b.localeCompare(a));
  return days.map((day) => {
    const sessions = sessionsByDay.get(day) ?? [];
    const topicIds = [...new Set(sessions.flatMap((session) => session.topicIds))];
    const masteredIds = [...new Set(sessions.flatMap((session) => session.masteredTopicIds))];
    const topicNames = topicIds.map((id) => catalog.byId.get(id)?.name ?? id);
    const masteredNames = masteredIds.map((id) => catalog.byId.get(id)?.name ?? id);
    const themeIds = [...new Set(topicIds.map((id) => catalog.pypMap?.topics[id]?.theme).filter((id): id is PypThemeId => Boolean(id)))];
    const themes = themeIds.map((id) => themeName(id));
    const badges = [
      ...new Set(
        progress.badgeLog.filter((event) => dayKey(event.at, timeZone) === day).map((event) => event.trait),
      ),
    ];
    const minutes = Math.max(
      1,
      Math.round(sessions.reduce((sum, session) => sum + Math.max(0, session.endedAt - session.startedAt), 0) / 60000),
    );
    const leadTopic = catalog.byId.get(topicIds[0] ?? "");
    const theme = catalog.pypMap?.topics[leadTopic?.id ?? ""]?.theme;
    const ideas = ideasFor(theme, leadTopic?.name ?? "today's lesson").slice(0, 3);
    const area = areaName(catalog.pypMap?.topics[leadTopic?.id ?? ""]?.area);
    const masteredLine = masteredNames.length ? ` New star skills: ${masteredNames.join(", ")}.` : "";
    const themeLine = themes.length ? ` Themes: ${themes.join("; ")}.` : "";
    const badgeLine = badges.length ? ` Learner profile: ${badges.join(", ")}.` : "";
    const narrative = `Today ${name} explored ${topicNames.slice(0, 4).join(", ") || "a lesson"} for about ${minutes} minute${minutes === 1 ? "" : "s"}.${masteredLine}${themeLine}${badgeLine} ${area} was part of the mix.`;
    return { day, minutes, topicNames, masteredNames, themes, badges, ideas, narrative };
  });
}

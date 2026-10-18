export function buildThemeMap(topics: { id: string; subject: string; domain: string; name: string; description?: string }[]): {
  missing: { id: string }[];
  topics: Record<string, { theme: string; area: string }>;
  themes: { id: string; name: string }[];
  areas: string[];
};

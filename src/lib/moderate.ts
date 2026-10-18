const INPUT_BLOCK = [
  /\b(?:porn|nude|naked|sex|sexual)\b/i,
  /kill yourself/i,
  /suicide/i,
  /how to make a bomb/i,
  /build a weapon/i,
  /\baddress\b.*\b(tell|give|what)\b/i,
  /what(?:'s| is) your (?:address|phone|school)/i,
];

const OUTPUT_BLOCK = [
  /\b(?:porn|nude|sexual)\b/i,
  /what(?:'s| is) your (?:full name|address|phone|school)/i,
  /where do you live/i,
  /tell me your school/i,
  /suicide/i,
  /kill yourself/i,
];

export function moderationReason(text: string, kind: "input" | "output"): string | null {
  const rules = kind === "input" ? INPUT_BLOCK : OUTPUT_BLOCK;
  if (text.length > (kind === "input" ? 500 : 1200)) return "too long";
  for (const rule of rules) {
    if (rule.test(text)) return "blocked";
  }
  return null;
}

export const SAFE_REDIRECT =
  "Let's ask a grown-up about that, and wonder about something else together. What are you curious about in the world?";

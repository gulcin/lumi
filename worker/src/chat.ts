import type { Sql } from "postgres";
import { moderationReason, SAFE_REDIRECT } from "../../src/lib/moderate";
import type { Env } from "./db";

const CHILD_SYSTEM = `You are Lumi, a curious fox who learns with a child of about 8 or 9 (grade 3).
Answer in 2 to 4 short sentences. Use simple words. Ask one question back.
Encourage questions and looking at the real world.
Do not ask for personal information such as a full name, address, school, phone, or precise location.
If a topic is unsafe, private, or for adults, say a grown-up should help and invite a different question.
Do not claim that the International Baccalaureate endorses you.
Stay kind.`;

const POLISH_SYSTEM = `You tidy a parent's note about a child's learning day.
Keep every fact. Do not add events, places, or feelings that are not in the note.
Use warm, plain sentences. Reply with the note only.`;

const CHAT_LIMIT = 30;
const POLISH_LIMIT = 10;

export async function bumpLimit(sql: Sql, familyId: string, bucket: string, limit: number): Promise<boolean> {
  const rows = await sql<{ count: number }[]>`
    INSERT INTO rate_limits (family_id, bucket, window_start, count)
    VALUES (${familyId}::uuid, ${bucket}, date_trunc('hour', now()), 1)
    ON CONFLICT (family_id, bucket) DO UPDATE
    SET
      count = CASE
        WHEN rate_limits.window_start < date_trunc('hour', now()) THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < date_trunc('hour', now()) THEN date_trunc('hour', now())
        ELSE rate_limits.window_start
      END
    RETURNING count
  `;
  return (rows[0]?.count ?? 1) <= limit;
}

async function complete(env: Env, system: string, messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  if (env.ANTHROPIC_API_KEY) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        max_tokens: 280,
        system,
        messages,
      }),
    });
    if (!response.ok) throw new Error("anthropic");
    const body = (await response.json()) as { content?: { type: string; text?: string }[] };
    return body.content?.map((part) => part.text ?? "").join("").trim() ?? "";
  }
  if (env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        max_tokens: 280,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!response.ok) throw new Error("openai");
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return body.choices?.[0]?.message?.content?.trim() ?? "";
  }
  throw new Error("no-model");
}

export async function runChat(
  sql: Sql,
  env: Env,
  familyId: string,
  childId: string | null,
  message: string,
  topicHint?: string,
): Promise<{ reply: string; status: number }> {
  if (moderationReason(message, "input")) {
    return { reply: SAFE_REDIRECT, status: 200 };
  }
  const allowed = await bumpLimit(sql, familyId, "chat", CHAT_LIMIT);
  if (!allowed) return { reply: "Lumi needs a short rest. Try again a little later.", status: 429 };
  const history = await sql<{ role: "user" | "assistant"; content: string }[]>`
    SELECT role, content FROM chat_messages
    WHERE family_id = ${familyId}::uuid
    ORDER BY created_at DESC
    LIMIT 6
  `;
  const prior = history.reverse().filter((row) => row.role === "user" || row.role === "assistant");
  const hint = topicHint && topicHint.length < 80 ? ` The child was just learning about: ${topicHint}.` : "";
  let reply = "";
  try {
    reply = await complete(env, CHILD_SYSTEM + hint, [...prior, { role: "user", content: message }]);
  } catch (error) {
    if (error instanceof Error && error.message === "no-model") {
      return { reply: "Voice chat is not switched on yet.", status: 503 };
    }
    return { reply: "I lost the trail for a moment. Ask me again.", status: 200 };
  }
  if (!reply || moderationReason(reply, "output")) reply = SAFE_REDIRECT;
  const child = childId ?? null;
  await sql`
    INSERT INTO chat_messages (family_id, child_id, role, content)
    VALUES (${familyId}::uuid, ${child}::uuid, 'user', ${message.slice(0, 500)})
  `;
  await sql`
    INSERT INTO chat_messages (family_id, child_id, role, content)
    VALUES (${familyId}::uuid, ${child}::uuid, 'assistant', ${reply.slice(0, 1200)})
  `;
  return { reply, status: 200 };
}

export async function runPolish(sql: Sql, env: Env, familyId: string, text: string): Promise<{ text: string; status: number }> {
  if (moderationReason(text, "input")) return { text, status: 200 };
  const allowed = await bumpLimit(sql, familyId, "polish", POLISH_LIMIT);
  if (!allowed) return { text, status: 429 };
  try {
    const polished = await complete(env, POLISH_SYSTEM, [{ role: "user", content: text.slice(0, 500) }]);
    if (!polished || moderationReason(polished, "output")) return { text, status: 200 };
    return { text: polished, status: 200 };
  } catch {
    return { text, status: 200 };
  }
}

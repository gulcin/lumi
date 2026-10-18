import { createFamilyCode, isFamilyCode, normalizeFamilyCode } from "../../src/lib/familyCode";
import { coerceProgress, mergeProgress } from "../../src/lib/syncMerge";
import { runChat, runPolish } from "./chat";
import { openSql, sha256, type Env } from "./db";
import { ensureMigrations, requestAuthorized } from "./migrate";

function json(body: unknown, status = 200, origin: string | null, allowed: string): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  applyCors(headers, origin, allowed);
  return new Response(JSON.stringify(body), { status, headers });
}

function applyCors(headers: Headers, origin: string | null, allowed: string): void {
  headers.set("access-control-allow-origin", origin === allowed ? allowed : allowed);
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type, authorization");
  headers.set("vary", "origin");
}

function allowedOrigin(env: Env): string {
  return env.ALLOWED_ORIGIN || "https://gulcin.github.io";
}

async function familyId(sql: ReturnType<typeof openSql>, code: string): Promise<string | null> {
  const hash = await sha256(normalizeFamilyCode(code));
  const rows = await sql<{ id: string }[]>`SELECT id FROM families WHERE code_hash = ${hash} LIMIT 1`;
  return rows[0]?.id ?? null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const allowed = allowedOrigin(env);
    if (origin && origin !== allowed) {
      return json({ error: "This app is not allowed to call Lumi from that site." }, 403, origin, allowed);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsOnly(origin, allowed) });
    }
    const url = new URL(request.url);
    try {
      if (url.pathname === "/admin/migrate" && request.method === "POST") {
        if (!requestAuthorized(request, env.ADMIN_TOKEN)) return json({ error: "Not allowed." }, 401, origin, allowed);
        const report = await ensureMigrations(env, true);
        return json(report, 200, origin, allowed);
      }
      await ensureMigrations(env);
      if (url.pathname === "/health") return json({ ok: true }, 200, origin, allowed);
      if (url.pathname === "/v1/families" && request.method === "POST") return await createFamily(env, origin, allowed);
      if (url.pathname === "/v1/family" && request.method === "GET") return await readFamily(url, env, origin, allowed);
      if (url.pathname === "/v1/progress" && request.method === "POST") return await mergeRoute(request, env, origin, allowed);
      if (url.pathname === "/v1/chat" && request.method === "GET") return await readChat(url, env, origin, allowed);
      if (url.pathname === "/v1/chat" && request.method === "POST") return await postChat(request, env, origin, allowed);
      if (url.pathname === "/v1/polish" && request.method === "POST") return await postPolish(request, env, origin, allowed);
      return json({ error: "Not found." }, 404, origin, allowed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "error");
      return json({ error: "The family book had a problem." }, 500, origin, allowed);
    }
  },
};

function corsOnly(origin: string | null, allowed: string): Headers {
  const headers = new Headers();
  applyCors(headers, origin, allowed);
  return headers;
}

async function createFamily(env: Env, origin: string | null, allowed: string): Promise<Response> {
  const code = createFamilyCode();
  const hash = await sha256(code);
  const sql = openSql(env);
  try {
    await sql`INSERT INTO families (code_hash) VALUES (${hash})`;
  } finally {
    await sql.end();
  }
  return json({ code }, 200, origin, allowed);
}

async function readFamily(url: URL, env: Env, origin: string | null, allowed: string): Promise<Response> {
  const code = url.searchParams.get("code") ?? "";
  if (!isFamilyCode(code)) return json({ error: "That family code was not found." }, 404, origin, allowed);
  const sql = openSql(env);
  try {
    const id = await familyId(sql, code);
    if (!id) return json({ error: "That family code was not found." }, 404, origin, allowed);
    const children = await sql<{ childKey: string; nickname: string }[]>`
      SELECT child_key AS "childKey", nickname FROM children WHERE family_id = ${id}::uuid ORDER BY updated_at DESC
    `;
    return json({ children }, 200, origin, allowed);
  } finally {
    await sql.end();
  }
}

async function mergeRoute(request: Request, env: Env, origin: string | null, allowed: string): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    code?: string;
    childKey?: string;
    nickname?: string;
    progress?: unknown;
  } | null;
  const code = body?.code ?? "";
  const childKey = (body?.childKey ?? "").slice(0, 80);
  const nickname = (body?.nickname ?? "friend").slice(0, 24);
  if (!isFamilyCode(code) || childKey.length < 8) return json({ error: "That family code was not found." }, 404, origin, allowed);
  const incoming = coerceProgress(body?.progress, childKey, nickname);
  if (!incoming) return json({ error: "That progress file could not be read." }, 400, origin, allowed);
  const raw = JSON.stringify(incoming);
  if (raw.length > 400_000) return json({ error: "That progress file is too large." }, 400, origin, allowed);
  const sql = openSql(env);
  try {
    const id = await familyId(sql, code);
    if (!id) return json({ error: "That family code was not found." }, 404, origin, allowed);
    const existing = await sql<{ document: unknown }[]>`
      SELECT document FROM progress_documents
      WHERE child_id = (
        SELECT id FROM children WHERE family_id = ${id}::uuid AND child_key = ${childKey} LIMIT 1
      )
    `;
    const stored = existing[0] ? coerceProgress(existing[0].document, childKey, nickname) : null;
    const merged = stored ? mergeProgress(stored, incoming) : incoming;
    const childRows = await sql<{ id: string }[]>`
      INSERT INTO children (family_id, child_key, nickname)
      VALUES (${id}::uuid, ${childKey}, ${nickname})
      ON CONFLICT (family_id, child_key) DO UPDATE SET nickname = EXCLUDED.nickname, updated_at = now()
      RETURNING id
    `;
    const childId = childRows[0]?.id;
    if (!childId) return json({ error: "The family book had a problem." }, 500, origin, allowed);
    await sql`
      INSERT INTO progress_documents (child_id, document, updated_at)
      VALUES (${childId}::uuid, ${sql.json(merged as never)}, now())
      ON CONFLICT (child_id) DO UPDATE SET document = EXCLUDED.document, updated_at = now()
    `;
    return json({ progress: merged }, 200, origin, allowed);
  } finally {
    await sql.end();
  }
}

async function childFor(sql: ReturnType<typeof openSql>, family: string, childKey: string): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM children WHERE family_id = ${family}::uuid AND child_key = ${childKey} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

async function readChat(url: URL, env: Env, origin: string | null, allowed: string): Promise<Response> {
  const code = url.searchParams.get("code") ?? "";
  const childKey = url.searchParams.get("childKey") ?? "";
  if (!isFamilyCode(code)) return json({ error: "That family code was not found." }, 404, origin, allowed);
  const sql = openSql(env);
  try {
    const id = await familyId(sql, code);
    if (!id) return json({ error: "That family code was not found." }, 404, origin, allowed);
    const messages = await sql<{ role: string; content: string; createdAt: string }[]>`
      SELECT role, content, created_at AS "createdAt"
      FROM chat_messages
      WHERE family_id = ${id}::uuid
        AND (${childKey} = '' OR child_id = (SELECT id FROM children WHERE family_id = ${id}::uuid AND child_key = ${childKey} LIMIT 1))
      ORDER BY created_at DESC
      LIMIT 40
    `;
    return json({ messages: messages.reverse() }, 200, origin, allowed);
  } finally {
    await sql.end();
  }
}

async function postChat(request: Request, env: Env, origin: string | null, allowed: string): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { code?: string; childKey?: string; message?: string; topicHint?: string } | null;
  const code = body?.code ?? "";
  const message = (body?.message ?? "").trim();
  const childKey = (body?.childKey ?? "").slice(0, 80);
  if (!isFamilyCode(code) || !message) return json({ error: "Say a little more, or check the family code." }, 400, origin, allowed);
  const sql = openSql(env);
  try {
    const id = await familyId(sql, code);
    if (!id) return json({ error: "That family code was not found." }, 404, origin, allowed);
    const childId = childKey ? await childFor(sql, id, childKey) : null;
    const result = await runChat(sql, env, id, childId, message, body?.topicHint);
    return json({ reply: result.reply }, result.status, origin, allowed);
  } finally {
    await sql.end();
  }
}

async function postPolish(request: Request, env: Env, origin: string | null, allowed: string): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { code?: string; text?: string } | null;
  const code = body?.code ?? "";
  const text = (body?.text ?? "").trim();
  if (!isFamilyCode(code) || !text) return json({ error: "Nothing to polish." }, 400, origin, allowed);
  const sql = openSql(env);
  try {
    const id = await familyId(sql, code);
    if (!id) return json({ error: "That family code was not found." }, 404, origin, allowed);
    const result = await runPolish(sql, env, id, text);
    return json({ text: result.text }, result.status, origin, allowed);
  } finally {
    await sql.end();
  }
}

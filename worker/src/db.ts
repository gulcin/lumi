import postgres, { type Sql } from "postgres";

export type Env = {
  DATABASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  OPENAI_MODEL?: string;
  ALLOWED_ORIGIN?: string;
  ADMIN_TOKEN?: string;
  HYPERDRIVE?: { connectionString: string };
};

export function connectionString(env: Env): string {
  const url = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  if (!url) throw new Error("missing database");
  return url;
}

export function openSql(env: Env): Sql {
  const url = connectionString(env);
  const hyperdrive = Boolean(env.HYPERDRIVE?.connectionString);
  return postgres(url, {
    ssl: hyperdrive ? undefined : "require",
    max: 1,
    fetch_types: false,
    prepare: false,
    connect_timeout: 15,
  });
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

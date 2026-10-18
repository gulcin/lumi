import { adminAuthorized } from "../../src/lib/adminAuth";
import { MIGRATION_LOCK_KEY, selectPending } from "../../src/lib/migratePlan";
import type { Env } from "./db";
import { openSql } from "./db";
import { MIGRATIONS } from "./migrations";

export type MigrateReport = { applied: string[]; skipped: string[] };

let ready = false;
let inflight: Promise<MigrateReport> | null = null;

export async function ensureMigrations(env: Env, force = false): Promise<MigrateReport> {
  if (ready && !force) return { applied: [], skipped: MIGRATIONS.map((file) => file.id) };
  if (!force && inflight) return inflight;
  const run = applyMigrations(env).then((report) => {
    ready = true;
    return report;
  });
  if (!force) inflight = run.finally(() => {
    inflight = null;
  });
  return run;
}

async function applyMigrations(env: Env): Promise<MigrateReport> {
  const sql = openSql(env);
  try {
    return await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`;
      await tx`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      const rows = await tx<{ id: string }[]>`SELECT id FROM schema_migrations`;
      const pending = selectPending(rows.map((row) => row.id), MIGRATIONS);
      const applied: string[] = [];
      for (const file of pending) {
        await tx.unsafe(file.sql);
        await tx`INSERT INTO schema_migrations (id) VALUES (${file.id})`;
        applied.push(file.id);
      }
      const skipped = MIGRATIONS.map((file) => file.id).filter((id) => !applied.includes(id));
      return { applied, skipped };
    });
  } finally {
    await sql.end();
  }
}

export function requestAuthorized(request: Request, token: string | undefined): boolean {
  return adminAuthorized(request.headers.get("authorization"), request.headers.get("x-admin-token"), token);
}

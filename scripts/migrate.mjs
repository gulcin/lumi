// Optional. Use this only if this machine can open port 5432.
// The supported path is the Worker: it bundles db/migrations and applies them
// on the first request, or when you POST /admin/migrate. See SETUP.md.
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to the ClickHouse Managed Postgres connection string (sslmode=require).");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "db", "migrations");
const sql = postgres(url, { ssl: "require", max: 1 });

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

const files = fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
for (const file of files) {
  const done = await sql`SELECT id FROM schema_migrations WHERE id = ${file}`;
  if (done.length) {
    console.log(`skip ${file}`);
    continue;
  }
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
    await tx`INSERT INTO schema_migrations (id) VALUES (${file})`;
  });
  console.log(`applied ${file}`);
}

await sql.end();
console.log("Migrations finished.");

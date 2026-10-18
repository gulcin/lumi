export type MigrationFile = { id: string; sql: string };

/** Files not yet recorded in schema_migrations, in the given order. */
export function selectPending(appliedIds: readonly string[], files: readonly MigrationFile[]): MigrationFile[] {
  const have = new Set(appliedIds);
  return files.filter((file) => file.id.endsWith(".sql") && file.sql.trim().length > 0 && !have.has(file.id));
}

/** Stable lock key so two Worker isolates cannot apply the same file at once. */
export const MIGRATION_LOCK_KEY = 81420118421;

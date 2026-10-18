import initSql from "../../db/migrations/001_init.sql";

/** Bundled copies of db/migrations. The Worker applies these; a laptop does not need port 5432. */
export const MIGRATIONS: { id: string; sql: string }[] = [{ id: "001_init.sql", sql: initSql }];

import type { Database } from "bun:sqlite";
import { SCHEMA_VERSION, MIGRATION_V1 } from "@/db/schema";

const MIGRATIONS: Record<number, string> = {
  1: MIGRATION_V1,
};

export function runMigrations(db: Database): void {
  db.run("CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");

  const currentVersion = getCurrentVersion(db);

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (!sql) {
      throw new Error(`Missing migration for version ${v}`);
    }
    db.transaction(() => {
      db.run(sql);
      db.prepare("INSERT OR REPLACE INTO _migrations (version) VALUES (?)").run(v);
    })();
  }
}

function getCurrentVersion(db: Database): number {
  try {
    const row = db.prepare("SELECT MAX(version) as version FROM _migrations").get() as { version: number | null } | null;
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

import type { Database } from "bun:sqlite";

export function getConfigValue(db: Database, key: string): string | null {
  const row = db.prepare("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | null;
  return row?.value ?? null;
}

export function setConfigValue(db: Database, key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, value);
}

export function deleteConfigValue(db: Database, key: string): boolean {
  const result = db.prepare("DELETE FROM config WHERE key = ?").run(key);
  return result.changes > 0;
}

export function listConfig(db: Database): Array<{ key: string; value: string }> {
  return db.prepare("SELECT key, value FROM config ORDER BY key").all() as Array<{ key: string; value: string }>;
}

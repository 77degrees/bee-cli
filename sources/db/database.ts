import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { runMigrations } from "@/db/migrations";

const DB_DIR = join(homedir(), ".bee");
const DB_PATH = join(DB_DIR, "data.db");

let instance: Database | null = null;

function ensureDbDir(): void {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { mode: 0o700, recursive: true });
  }
}

export function getDatabase(): Database {
  if (instance) {
    return instance;
  }

  ensureDbDir();
  const db = new Database(DB_PATH);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  runMigrations(db);
  instance = db;
  return db;
}

export function tryOpenDatabase(): Database | null {
  if (instance) {
    return instance;
  }
  if (!existsSync(DB_PATH)) {
    return null;
  }
  return getDatabase();
}

export function closeDatabase(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

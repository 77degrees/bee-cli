import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CREDS_DIR = join(homedir(), ".bee", "credentials");

function ensureCredsDir(): void {
  if (!existsSync(CREDS_DIR)) {
    mkdirSync(CREDS_DIR, { mode: 0o700, recursive: true });
  }
}

function credPath(integrationName: string): string {
  return join(CREDS_DIR, `${integrationName}.json`);
}

export type StoredCredential = {
  password: string;
};

export function loadCredential(integrationName: string): StoredCredential | null {
  const filePath = credPath(integrationName);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8")) as StoredCredential;
    return data;
  } catch {
    return null;
  }
}

export function saveCredential(integrationName: string, credential: StoredCredential): void {
  ensureCredsDir();
  writeFileSync(credPath(integrationName), JSON.stringify(credential), { mode: 0o600 });
}

export function deleteCredential(integrationName: string): void {
  const filePath = credPath(integrationName);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

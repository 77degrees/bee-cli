import type { Database } from "bun:sqlite";
import type { IntegrationConfig, IntegrationType, ProviderName } from "@/integrations/types";

export function listIntegrations(db: Database): IntegrationConfig[] {
  const rows = db.prepare("SELECT * FROM integrations ORDER BY name").all() as Array<{
    id: number;
    name: string;
    type: string;
    provider: string;
    host: string | null;
    port: number | null;
    username: string | null;
    enabled: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as IntegrationType,
    provider: r.provider as ProviderName,
    host: r.host,
    port: r.port,
    username: r.username,
    enabled: r.enabled === 1,
  }));
}

export function getIntegration(db: Database, name: string): IntegrationConfig | null {
  const row = db.prepare("SELECT * FROM integrations WHERE name = ?").get(name) as {
    id: number;
    name: string;
    type: string;
    provider: string;
    host: string | null;
    port: number | null;
    username: string | null;
    enabled: number;
  } | null;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type as IntegrationType,
    provider: row.provider as ProviderName,
    host: row.host,
    port: row.port,
    username: row.username,
    enabled: row.enabled === 1,
  };
}

export function createIntegration(
  db: Database,
  config: {
    name: string;
    type: IntegrationType;
    provider: ProviderName;
    host?: string | undefined;
    port?: number | undefined;
    username?: string | undefined;
  }
): void {
  db.prepare(
    `INSERT INTO integrations (name, type, provider, host, port, username)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    config.name,
    config.type,
    config.provider,
    config.host ?? null,
    config.port ?? null,
    config.username ?? null
  );
}

export function deleteIntegration(db: Database, name: string): boolean {
  const result = db.prepare("DELETE FROM integrations WHERE name = ?").run(name);
  return result.changes > 0;
}

export function getIntegrationsByType(
  db: Database,
  type: IntegrationType
): IntegrationConfig[] {
  return listIntegrations(db).filter((i) => i.type === type && i.enabled);
}

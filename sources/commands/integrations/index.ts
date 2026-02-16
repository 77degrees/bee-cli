import type { Command } from "@/commands/types";
import { printJson } from "@/client/clientApi";
import { input, select, password } from "@inquirer/prompts";
import { getDatabase } from "@/db/database";
import {
  listIntegrations,
  getIntegration,
  createIntegration,
  deleteIntegration,
} from "@/integrations/db";
import { saveCredential, deleteCredential } from "@/integrations/credentialStore";
import { getProviderDefaults } from "@/integrations/providers/defaults";
import type { IntegrationType, ProviderName } from "@/integrations/types";

const USAGE = [
  "bee integrations add <calendar|mail>",
  "bee integrations list [--json]",
  "bee integrations remove <name>",
  "bee integrations test <name>",
].join("\n");

export const integrationsCommand: Command = {
  name: "integrations",
  description: "Manage calendar and mail integrations.",
  usage: USAGE,
  run: async (args, _context) => {
    if (args.length === 0) {
      throw new Error("Missing subcommand. Use add, list, remove, or test.");
    }

    const [subcommand, ...rest] = args;
    switch (subcommand) {
      case "add":
        await handleAdd(rest);
        return;
      case "list":
        handleList(rest);
        return;
      case "remove":
        handleRemove(rest);
        return;
      case "test":
        await handleTest(rest);
        return;
      default:
        throw new Error(`Unknown integrations subcommand: ${subcommand}`);
    }
  },
};

async function handleAdd(args: readonly string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error("Specify type: bee integrations add <calendar|mail>");
  }

  const type = args[0] as IntegrationType;
  if (type !== "calendar" && type !== "mail") {
    throw new Error(`Unknown integration type: ${type}. Use "calendar" or "mail".`);
  }

  const provider = await select<ProviderName>({
    message: "Select provider:",
    choices: [
      { value: "icloud" as const, name: "iCloud" },
      { value: "google" as const, name: "Google" },
      { value: "outlook" as const, name: "Outlook" },
      { value: "generic" as const, name: "Generic (custom server)" },
    ],
  });

  const name = await input({
    message: "Integration name (unique identifier):",
    default: `${provider}-${type}`,
  });

  const defaults = getProviderDefaults(provider);
  const username = await input({ message: "Username (email):" });

  let host: string | undefined;
  let port: number | undefined;

  if (type === "calendar") {
    const defaultHost = defaults.calendarHost ?? "";
    host = await input({
      message: "CalDAV server host:",
      default: defaultHost,
    });
  } else {
    const defaultHost = defaults.imapHost ?? "";
    host = await input({
      message: "IMAP server host:",
      default: defaultHost,
    });
    const defaultPort = String(defaults.imapPort ?? 993);
    const portStr = await input({
      message: "IMAP port:",
      default: defaultPort,
    });
    port = Number.parseInt(portStr, 10);
  }

  const pass = await password({
    message: "App-specific password:",
  });

  const db = getDatabase();
  const existing = getIntegration(db, name);
  if (existing) {
    throw new Error(`Integration "${name}" already exists. Remove it first.`);
  }

  createIntegration(db, {
    name,
    type,
    provider,
    host,
    port,
    username,
  });

  saveCredential(name, { password: pass });
  console.log(`Integration "${name}" added successfully.`);
}

function handleList(args: readonly string[]): void {
  const json = parseJsonFlag(args);
  const db = getDatabase();
  const integrations = listIntegrations(db);

  if (json) {
    printJson(integrations);
    return;
  }

  if (integrations.length === 0) {
    console.log("No integrations configured. Add one with: bee integrations add <calendar|mail>");
    return;
  }

  console.log("# Integrations\n");
  for (const integration of integrations) {
    const status = integration.enabled ? "enabled" : "disabled";
    console.log(`  ${integration.name} (${integration.type}/${integration.provider}) [${status}]`);
    if (integration.host) {
      console.log(`    Host: ${integration.host}${integration.port ? `:${integration.port}` : ""}`);
    }
    if (integration.username) {
      console.log(`    User: ${integration.username}`);
    }
  }
}

function handleRemove(args: readonly string[]): void {
  const name = parsePositional(args, "integration name");
  const db = getDatabase();

  const deleted = deleteIntegration(db, name);
  if (!deleted) {
    throw new Error(`Integration "${name}" not found.`);
  }

  deleteCredential(name);
  console.log(`Removed integration "${name}".`);
}

async function handleTest(args: readonly string[]): Promise<void> {
  const name = parsePositional(args, "integration name");
  const db = getDatabase();

  const config = getIntegration(db, name);
  if (!config) {
    throw new Error(`Integration "${name}" not found.`);
  }

  console.log(`Testing "${name}" (${config.type}/${config.provider})...`);

  if (config.type === "calendar") {
    const { createCalendarProviderFromConfig } = await import("@/integrations/providers/registry");
    const provider = await createCalendarProviderFromConfig(config);
    const calendars = await provider.listCalendars();
    console.log(`  Found ${calendars.length} calendar(s):`);
    for (const cal of calendars) {
      console.log(`    - ${cal}`);
    }
  } else {
    const { createMailProviderFromConfig } = await import("@/integrations/providers/registry");
    const provider = createMailProviderFromConfig(config);
    try {
      const messages = await provider.recent(3);
      console.log(`  Connection successful. ${messages.length} recent message(s):`);
      for (const msg of messages) {
        console.log(`    - ${msg.subject} (from: ${msg.from})`);
      }
    } finally {
      await provider.disconnect();
    }
  }

  console.log("  Test passed.");
}

function parseJsonFlag(args: readonly string[]): boolean {
  for (const arg of args) {
    if (arg === "--json") {
      return true;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }
  return false;
}

function parsePositional(args: readonly string[], label: string): string {
  const positionals: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positionals.push(arg);
  }
  if (positionals.length === 0) {
    throw new Error(`Missing ${label}.`);
  }
  if (positionals.length > 1) {
    throw new Error(`Unexpected arguments: ${positionals.slice(1).join(" ")}`);
  }
  return positionals[0]!;
}

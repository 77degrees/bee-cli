import type { Command } from "@/commands/types";
import { printJson } from "@/client/clientApi";
import { getDatabase } from "@/db/database";
import { getIntegrationsByType } from "@/integrations/db";
import { createMailProviderFromConfig } from "@/integrations/providers/registry";
import type { MailMessage, MailProvider } from "@/integrations/types";

const USAGE = [
  "bee mail recent [--limit N] [--json]",
  'bee mail search --query "..." [--provider NAME] [--limit N] [--json]',
].join("\n");

export const mailCommand: Command = {
  name: "mail",
  description: "View mail from configured IMAP providers.",
  usage: USAGE,
  run: async (args, _context) => {
    if (args.length === 0) {
      throw new Error("Missing subcommand. Use recent or search.");
    }

    const [subcommand, ...rest] = args;
    switch (subcommand) {
      case "recent":
        await handleRecent(rest);
        return;
      case "search":
        await handleSearch(rest);
        return;
      default:
        throw new Error(`Unknown mail subcommand: ${subcommand}`);
    }
  },
};

async function handleRecent(args: readonly string[]): Promise<void> {
  const { limit, json } = parseRecentArgs(args);
  const providers = await getMailProviders();

  const allMessages: Array<MailMessage & { provider_name: string }> = [];

  for (const { config, provider } of providers) {
    try {
      const messages = await provider.recent(limit);
      allMessages.push(
        ...messages.map((m) => ({ ...m, provider_name: config.name }))
      );
    } catch (err) {
      if (!json) {
        console.error(`Warning: Failed to fetch from "${config.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      await provider.disconnect();
    }
  }

  allMessages.sort((a, b) => b.date.localeCompare(a.date));

  if (json) {
    printJson(allMessages.slice(0, limit));
    return;
  }

  if (allMessages.length === 0) {
    console.log("No messages found.");
    return;
  }

  console.log("# Recent Mail\n");
  for (const msg of allMessages.slice(0, limit)) {
    console.log(`  [${msg.provider_name}] ${msg.date}`);
    console.log(`    From: ${msg.from}`);
    console.log(`    Subject: ${msg.subject}`);
    console.log("");
  }
}

async function handleSearch(args: readonly string[]): Promise<void> {
  const { query, providerName, limit, json } = parseSearchArgs(args);
  const providers = await getMailProviders(providerName);

  const allMessages: Array<MailMessage & { provider_name: string }> = [];

  for (const { config, provider } of providers) {
    try {
      const messages = await provider.search(query, limit);
      allMessages.push(
        ...messages.map((m) => ({ ...m, provider_name: config.name }))
      );
    } catch (err) {
      if (!json) {
        console.error(`Warning: Search failed for "${config.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      await provider.disconnect();
    }
  }

  if (json) {
    printJson(allMessages.slice(0, limit));
    return;
  }

  if (allMessages.length === 0) {
    console.log(`No messages found matching "${query}".`);
    return;
  }

  console.log(`# Search Results for "${query}"\n`);
  for (const msg of allMessages.slice(0, limit)) {
    console.log(`  [${msg.provider_name}] ${msg.date}`);
    console.log(`    From: ${msg.from}`);
    console.log(`    Subject: ${msg.subject}`);
    console.log("");
  }
}

type MailProviderEntry = {
  config: { name: string };
  provider: MailProvider;
};

async function getMailProviders(filterName?: string): Promise<MailProviderEntry[]> {
  const db = getDatabase();
  let integrations = getIntegrationsByType(db, "mail");

  if (filterName) {
    integrations = integrations.filter((i) => i.name === filterName);
    if (integrations.length === 0) {
      throw new Error(`Mail integration "${filterName}" not found.`);
    }
  }

  if (integrations.length === 0) {
    throw new Error("No mail integrations configured. Run: bee integrations add mail");
  }

  return integrations.map((config) => ({
    config,
    provider: createMailProviderFromConfig(config),
  }));
}

function parseRecentArgs(args: readonly string[]): { limit: number; json: boolean } {
  let limit = 20;
  let json = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--limit") {
      const val = args[i + 1];
      if (!val) {
        throw new Error("--limit requires a value");
      }
      limit = Number.parseInt(val, 10);
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      i += 1;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  return { limit, json };
}

function parseSearchArgs(
  args: readonly string[]
): { query: string; providerName?: string | undefined; limit: number; json: boolean } {
  let query: string | undefined;
  let providerName: string | undefined;
  let limit = 20;
  let json = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--query") {
      query = args[i + 1];
      if (!query) {
        throw new Error("--query requires a value");
      }
      i += 1;
      continue;
    }
    if (arg === "--provider") {
      providerName = args[i + 1];
      if (!providerName) {
        throw new Error("--provider requires a value");
      }
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      const val = args[i + 1];
      if (!val) {
        throw new Error("--limit requires a value");
      }
      limit = Number.parseInt(val, 10);
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      i += 1;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (!query) {
    throw new Error("Missing --query.");
  }

  return { query, providerName, limit, json };
}

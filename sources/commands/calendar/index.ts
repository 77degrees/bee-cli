import type { Command } from "@/commands/types";
import { printJson } from "@/client/clientApi";
import { getDatabase } from "@/db/database";
import { getIntegrationsByType } from "@/integrations/db";
import { createCalendarProviderFromConfig } from "@/integrations/providers/registry";
import type { CalendarEvent } from "@/integrations/types";

const USAGE = [
  "bee calendar list [--json]",
  "bee calendar events [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--json]",
].join("\n");

export const calendarCommand: Command = {
  name: "calendar",
  description: "View calendar events from configured providers.",
  usage: USAGE,
  run: async (args, _context) => {
    if (args.length === 0) {
      throw new Error("Missing subcommand. Use list or events.");
    }

    const [subcommand, ...rest] = args;
    switch (subcommand) {
      case "list":
        await handleList(rest);
        return;
      case "events":
        await handleEvents(rest);
        return;
      default:
        throw new Error(`Unknown calendar subcommand: ${subcommand}`);
    }
  },
};

async function handleList(args: readonly string[]): Promise<void> {
  const json = parseJsonFlag(args);
  const db = getDatabase();
  const integrations = getIntegrationsByType(db, "calendar");

  if (integrations.length === 0) {
    throw new Error("No calendar integrations configured. Run: bee integrations add calendar");
  }

  const allCalendars: Array<{ provider: string; calendars: string[] }> = [];

  for (const config of integrations) {
    try {
      const provider = await createCalendarProviderFromConfig(config);
      const calendars = await provider.listCalendars();
      allCalendars.push({ provider: config.name, calendars });
    } catch (err) {
      if (!json) {
        console.error(`Warning: Failed to connect to "${config.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (json) {
    printJson(allCalendars);
    return;
  }

  console.log("# Calendars\n");
  for (const entry of allCalendars) {
    console.log(`## ${entry.provider}`);
    for (const cal of entry.calendars) {
      console.log(`  - ${cal}`);
    }
    console.log("");
  }
}

async function handleEvents(args: readonly string[]): Promise<void> {
  const { from, to, json } = parseEventsArgs(args);
  const db = getDatabase();
  const integrations = getIntegrationsByType(db, "calendar");

  if (integrations.length === 0) {
    throw new Error("No calendar integrations configured. Run: bee integrations add calendar");
  }

  const allEvents: CalendarEvent[] = [];

  for (const config of integrations) {
    try {
      const provider = await createCalendarProviderFromConfig(config);
      const events = await provider.listEvents(from, to);
      allEvents.push(...events);
    } catch (err) {
      if (!json) {
        console.error(`Warning: Failed to fetch from "${config.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  allEvents.sort((a, b) => a.start.localeCompare(b.start));

  if (json) {
    printJson(allEvents);
    return;
  }

  if (allEvents.length === 0) {
    console.log("No events found in the specified range.");
    return;
  }

  console.log(`# Calendar Events (${formatDate(from)} to ${formatDate(to)})\n`);
  for (const event of allEvents) {
    const timeRange = event.end ? `${event.start} - ${event.end}` : event.start;
    console.log(`  ${timeRange}`);
    console.log(`    ${event.summary}`);
    if (event.location) {
      console.log(`    Location: ${event.location}`);
    }
    console.log("");
  }
}

function parseEventsArgs(args: readonly string[]): { from: Date; to: Date; json: boolean } {
  let fromStr: string | undefined;
  let toStr: string | undefined;
  let json = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--from") {
      fromStr = args[i + 1];
      if (!fromStr) {
        throw new Error("--from requires a date (YYYY-MM-DD)");
      }
      i += 1;
      continue;
    }
    if (arg === "--to") {
      toStr = args[i + 1];
      if (!toStr) {
        throw new Error("--to requires a date (YYYY-MM-DD)");
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

  const now = new Date();
  const from = fromStr ? new Date(fromStr) : startOfDay(now);
  const to = toStr ? new Date(toStr) : endOfDay(addDays(now, 7));

  return { from, to, json };
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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? date.toISOString();
}

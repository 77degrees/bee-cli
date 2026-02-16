import type { Command } from "@/commands/types";
import { printJson } from "@/client/clientApi";
import { getDatabase } from "@/db/database";
import {
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
  listConfig,
} from "@/db/configRepo";

const USAGE = [
  "bee config set <key> <value>",
  "bee config get <key> [--json]",
  "bee config list [--json]",
  "bee config delete <key>",
].join("\n");

export const configCommand: Command = {
  name: "config",
  description: "Manage local configuration.",
  usage: USAGE,
  run: async (args, _context) => {
    if (args.length === 0) {
      throw new Error("Missing subcommand. Use set, get, list, or delete.");
    }

    const [subcommand, ...rest] = args;
    switch (subcommand) {
      case "set":
        handleSet(rest);
        return;
      case "get":
        handleGet(rest);
        return;
      case "list":
        handleList(rest);
        return;
      case "delete":
        handleDelete(rest);
        return;
      default:
        throw new Error(`Unknown config subcommand: ${subcommand}`);
    }
  },
};

function handleSet(args: readonly string[]): void {
  const { key, value } = parseSetArgs(args);
  const db = getDatabase();
  setConfigValue(db, key, value);
  console.log(`Set ${key} = ${value}`);
}

function handleGet(args: readonly string[]): void {
  const { key, json } = parseGetArgs(args);
  const db = getDatabase();
  const value = getConfigValue(db, key);

  if (json) {
    printJson({ key, value });
    return;
  }

  if (value === null) {
    console.log(`${key}: (not set)`);
  } else {
    console.log(`${key}: ${value}`);
  }
}

function handleList(args: readonly string[]): void {
  const json = parseListArgs(args);
  const db = getDatabase();
  const entries = listConfig(db);

  if (json) {
    printJson(entries);
    return;
  }

  if (entries.length === 0) {
    console.log("No configuration values set.");
    return;
  }

  console.log("# Configuration\n");
  for (const entry of entries) {
    console.log(`- ${entry.key}: ${entry.value}`);
  }
}

function handleDelete(args: readonly string[]): void {
  const key = parseDeleteArgs(args);
  const db = getDatabase();
  const deleted = deleteConfigValue(db, key);

  if (deleted) {
    console.log(`Deleted ${key}.`);
  } else {
    console.log(`${key} was not set.`);
  }
}

function parseSetArgs(args: readonly string[]): { key: string; value: string } {
  const positionals: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positionals.push(arg);
  }

  if (positionals.length < 2) {
    throw new Error("Usage: bee config set <key> <value>");
  }
  if (positionals.length > 2) {
    throw new Error(`Unexpected arguments: ${positionals.slice(2).join(" ")}`);
  }

  return { key: positionals[0]!, value: positionals[1]! };
}

function parseGetArgs(args: readonly string[]): { key: string; json: boolean } {
  const positionals: string[] = [];
  let json = false;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positionals.push(arg);
  }

  if (positionals.length === 0) {
    throw new Error("Missing config key.");
  }
  if (positionals.length > 1) {
    throw new Error(`Unexpected arguments: ${positionals.slice(1).join(" ")}`);
  }

  return { key: positionals[0]!, json };
}

function parseListArgs(args: readonly string[]): boolean {
  let json = false;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  return json;
}

function parseDeleteArgs(args: readonly string[]): string {
  const positionals: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positionals.push(arg);
  }

  if (positionals.length === 0) {
    throw new Error("Missing config key.");
  }
  if (positionals.length > 1) {
    throw new Error(`Unexpected arguments: ${positionals.slice(1).join(" ")}`);
  }

  return positionals[0]!;
}

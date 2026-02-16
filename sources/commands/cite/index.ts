import type { Command, CommandContext } from "@/commands/types";
import { printJson, requestClientJson } from "@/client/clientApi";
import { getDatabase } from "@/db/database";
import {
  getCitationsForFact,
  upsertCitation,
  clearAllCitations,
  getCitationCount,
} from "@/db/citationRepo";
import { resolveAiProvider } from "@/ai/provider";
import { verifyCitation } from "@/ai/citationMatcher";

const USAGE = [
  "bee cite <fact_id> [--json]",
  "bee cite search --query <text> [--limit N] [--json]",
  "bee cite rebuild [--json]",
].join("\n");

const REBUILD_CONCURRENCY = 2;

export const citeCommand: Command = {
  name: "cite",
  description: "Show or rebuild fact citations.",
  usage: USAGE,
  run: async (args, context) => {
    if (args.length === 0) {
      throw new Error("Missing subcommand or fact id. Use <fact_id>, search, or rebuild.");
    }

    const first = args[0]!;
    if (first === "search") {
      await handleSearch(args.slice(1), context);
      return;
    }
    if (first === "rebuild") {
      await handleRebuild(args.slice(1), context);
      return;
    }

    await handleShow(args, context);
  },
};

async function handleShow(
  args: readonly string[],
  _context: CommandContext
): Promise<void> {
  const { id, json } = parseShowArgs(args);
  const db = getDatabase();
  const citations = getCitationsForFact(db, id);

  if (json) {
    printJson({ fact_id: id, citations });
    return;
  }

  if (citations.length === 0) {
    console.log(`No citations found for fact ${id}. Run: bee cite rebuild`);
    return;
  }

  console.log(`# Citations for Fact ${id}\n`);
  for (const citation of citations) {
    const score = (citation.relevance_score * 100).toFixed(0);
    console.log(`  Conversation #${citation.conversation_id} (${score}% relevance)`);
    if (citation.snippet) {
      console.log(`    "${citation.snippet}"`);
    }
  }
}

async function handleSearch(
  args: readonly string[],
  context: CommandContext
): Promise<void> {
  const { query, limit, json } = parseSearchArgs(args);
  const db = getDatabase();

  const params = new URLSearchParams();
  params.set("query", query);
  params.set("limit", String(limit));
  params.set("neural", "true");
  const data = await requestClientJson(context, `/v1/search/conversations/neural?${params.toString()}`, { method: "GET" });

  if (json) {
    printJson(data);
    return;
  }

  const results = parseSearchResults(data);
  if (results.length === 0) {
    console.log("No matching conversations found.");
    return;
  }

  console.log(`# Search Results for "${query}"\n`);
  for (const result of results) {
    console.log(`  Conversation #${result.id} - ${result.summary ?? "(no summary)"}`);
  }

  void db;
}

async function handleRebuild(
  args: readonly string[],
  context: CommandContext
): Promise<void> {
  const json = parseRebuildArgs(args);
  const db = getDatabase();
  const aiProvider = resolveAiProvider();

  console.log("Fetching all facts...");
  const factsData = await requestClientJson(context, "/v1/facts?confirmed=true&limit=100", { method: "GET" });
  const facts = parseFacts(factsData);

  if (facts.length === 0) {
    console.log("No confirmed facts found.");
    return;
  }

  console.log(`Found ${facts.length} fact(s). Indexing citations...`);
  clearAllCitations(db);

  let indexed = 0;
  const queue = [...facts];

  async function processOne(): Promise<void> {
    while (queue.length > 0) {
      const fact = queue.shift();
      if (!fact) {
        break;
      }

      const params = new URLSearchParams();
      params.set("query", fact.text);
      params.set("limit", "5");
      params.set("neural", "true");

      try {
        const searchData = await requestClientJson(
          context,
          `/v1/search/conversations/neural?${params.toString()}`,
          { method: "GET" }
        );
        const results = parseSearchResults(searchData);

        for (const result of results) {
          let snippet: string | null = null;
          let relevance = result.score ?? 0.5;
          let verified = false;

          if (aiProvider && result.id) {
            try {
              const convData = await requestClientJson(context, `/v1/conversations/${result.id}`, { method: "GET" });
              const transcript = extractTranscriptText(convData);
              if (transcript) {
                const verification = await verifyCitation(aiProvider, fact.text, transcript, result.id);
                snippet = verification.snippet;
                relevance = verification.relevance_score;
                verified = verification.relevant;
              }
            } catch {
              // AI verification failed, use search score
            }
          }

          upsertCitation(db, fact.id, result.id, relevance, snippet, verified);
        }
      } catch {
        // Search failed for this fact, continue
      }

      indexed += 1;
      if (!json) {
        process.stdout.write(`\r  Indexed ${indexed}/${facts.length} facts`);
      }
    }
  }

  const workers = Array.from({ length: REBUILD_CONCURRENCY }, () => processOne());
  await Promise.all(workers);

  if (!json) {
    console.log("");
  }

  const count = getCitationCount(db);
  if (json) {
    printJson({ facts_processed: facts.length, citations_created: count });
  } else {
    console.log(`Done. Created ${count} citation(s) for ${facts.length} fact(s).`);
  }
}

function parseShowArgs(args: readonly string[]): { id: number; json: boolean } {
  let json = false;
  const positionals: string[] = [];

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
    throw new Error("Missing fact id.");
  }
  const id = Number.parseInt(positionals[0] ?? "", 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Fact id must be a positive integer.");
  }

  return { id, json };
}

function parseSearchArgs(args: readonly string[]): { query: string; limit: number; json: boolean } {
  let query: string | undefined;
  let limit = 10;
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

  return { query, limit, json };
}

function parseRebuildArgs(args: readonly string[]): boolean {
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

type ParsedFact = { id: number; text: string };

function parseFacts(data: unknown): ParsedFact[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const payload = data as { facts?: Array<{ id?: number; text?: string }> };
  if (!Array.isArray(payload.facts)) {
    return [];
  }
  return payload.facts
    .filter((f): f is { id: number; text: string } =>
      typeof f.id === "number" && typeof f.text === "string"
    );
}

type SearchResult = { id: number; summary?: string | null; score?: number };

function parseSearchResults(data: unknown): SearchResult[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const payload = data as { conversations?: Array<{ id?: number; summary?: string | null; score?: number }> };
  if (!Array.isArray(payload.conversations)) {
    return [];
  }
  return payload.conversations
    .filter((c): c is { id: number; summary?: string | null; score?: number } =>
      typeof c.id === "number"
    );
}

function extractTranscriptText(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const payload = data as {
    conversation?: {
      transcriptions?: Array<{
        realtime?: boolean;
        utterances?: Array<{ speaker?: string; text?: string }>;
      }>;
    };
  };

  const transcriptions = payload.conversation?.transcriptions;
  if (!transcriptions || transcriptions.length === 0) {
    return null;
  }

  const nonRealtime = transcriptions.find((t) => !t.realtime);
  const transcription = nonRealtime ?? transcriptions[0];
  if (!transcription?.utterances) {
    return null;
  }

  const lines = transcription.utterances
    .filter((u) => typeof u.text === "string")
    .map((u) => `${u.speaker ?? "unknown"}: ${u.text}`);

  return lines.length > 0 ? lines.join("\n") : null;
}

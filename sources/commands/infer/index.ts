import type { Command, CommandContext } from "@/commands/types";
import { printJson, requestClientJson } from "@/client/clientApi";
import { getDatabase } from "@/db/database";
import {
  getInferencesForConversation,
  upsertInference,
  clearInferencesForConversation,
  listAllInferences,
} from "@/db/inferenceRepo";
import { requireAiProvider } from "@/ai/provider";
import { fillTranscriptGaps, isUnclearUtterance } from "@/ai/gapFiller";

const USAGE = [
  "bee infer <conversation_id> [--json]",
  "bee infer list [--conversation <id>] [--limit N] [--json]",
  "bee infer clear [--conversation <id>]",
].join("\n");

export const inferCommand: Command = {
  name: "infer",
  description: "AI-powered transcript gap filling.",
  usage: USAGE,
  run: async (args, context) => {
    if (args.length === 0) {
      throw new Error("Missing subcommand or conversation id.");
    }

    const first = args[0]!;
    if (first === "list") {
      handleList(args.slice(1));
      return;
    }
    if (first === "clear") {
      handleClear(args.slice(1));
      return;
    }

    await handleInfer(args, context);
  },
};

async function handleInfer(
  args: readonly string[],
  context: CommandContext
): Promise<void> {
  const { id, json } = parseInferArgs(args);
  const provider = requireAiProvider();
  const db = getDatabase();

  const data = await requestClientJson(context, `/v1/conversations/${id}`, { method: "GET" });
  const utterances = extractUtterances(data);

  if (utterances.length === 0) {
    throw new Error("No utterances found in this conversation.");
  }

  const unclear = utterances.filter((u) => isUnclearUtterance(u.text));

  if (unclear.length === 0) {
    if (json) {
      printJson({ conversation_id: id, inferences: [] });
    } else {
      console.log("No unclear utterances detected in this conversation.");
    }
    return;
  }

  const contextText = utterances
    .map((u) => `[${u.speaker}]: ${u.text}`)
    .join("\n");

  const response = await fillTranscriptGaps(
    provider,
    contextText,
    unclear.map((u) => ({ id: u.id, speaker: u.speaker, text: u.text }))
  );

  for (const result of response.results) {
    if (result.confidence > 0.3) {
      const original = unclear.find((u) => u.id === result.utterance_id);
      if (original) {
        upsertInference(
          db,
          id,
          result.utterance_id,
          original.text,
          result.inferred_text,
          result.confidence,
          response.provider,
          response.model
        );
      }
    }
  }

  if (json) {
    printJson({
      conversation_id: id,
      inferences: response.results,
    });
    return;
  }

  console.log(`# Transcript Inferences - Conversation ${id}\n`);
  console.log(`Analyzed ${unclear.length} unclear utterance(s).\n`);

  for (const result of response.results) {
    const confidence = (result.confidence * 100).toFixed(0);
    const original = unclear.find((u) => u.id === result.utterance_id);
    console.log(`  Utterance ${result.utterance_id}:`);
    console.log(`    Original: "${original?.text ?? "(unknown)"}"`);
    console.log(`    Inferred: "${result.inferred_text}" (${confidence}% confidence)`);
    if (result.reasoning) {
      console.log(`    Reason: ${result.reasoning}`);
    }
    console.log("");
  }
}

function handleList(args: readonly string[]): void {
  const { conversationId, limit, json } = parseListArgs(args);
  const db = getDatabase();

  const inferences = conversationId
    ? getInferencesForConversation(db, conversationId)
    : listAllInferences(db, limit);

  if (json) {
    printJson(inferences);
    return;
  }

  if (inferences.length === 0) {
    console.log("No inferences stored.");
    return;
  }

  console.log("# Stored Inferences\n");
  for (const inf of inferences) {
    const confidence = (inf.confidence * 100).toFixed(0);
    console.log(`  [Conv ${inf.conversation_id}, Utt ${inf.utterance_id}]`);
    console.log(`    "${inf.original_text}" -> "${inf.inferred_text}" (${confidence}%)`);
  }
}

function handleClear(args: readonly string[]): void {
  const conversationId = parseClearArgs(args);
  const db = getDatabase();

  if (conversationId) {
    clearInferencesForConversation(db, conversationId);
    console.log(`Cleared inferences for conversation ${conversationId}.`);
  } else {
    db.prepare("DELETE FROM ai_inferences").run();
    console.log("Cleared all inferences.");
  }
}

type Utterance = { id: number; speaker: string; text: string };

function extractUtterances(data: unknown): Utterance[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const payload = data as {
    conversation?: {
      transcriptions?: Array<{
        realtime?: boolean;
        utterances?: Array<{ id?: number; speaker?: string; text?: string }>;
      }>;
    };
  };
  const transcriptions = payload.conversation?.transcriptions;
  if (!transcriptions || transcriptions.length === 0) {
    return [];
  }

  const nonRealtime = transcriptions.find((t) => !t.realtime);
  const transcription = nonRealtime ?? transcriptions[0];
  if (!transcription?.utterances) {
    return [];
  }

  return transcription.utterances
    .filter(
      (u): u is { id: number; speaker: string; text: string } =>
        typeof u.id === "number" &&
        typeof u.speaker === "string" &&
        typeof u.text === "string"
    );
}

function parseInferArgs(args: readonly string[]): { id: number; json: boolean } {
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
    throw new Error("Missing conversation id.");
  }
  const id = Number.parseInt(positionals[0] ?? "", 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Conversation id must be a positive integer.");
  }

  return { id, json };
}

function parseListArgs(args: readonly string[]): {
  conversationId?: number | undefined;
  limit: number;
  json: boolean;
} {
  let conversationId: number | undefined;
  let limit = 50;
  let json = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--conversation") {
      const val = args[i + 1];
      if (!val) {
        throw new Error("--conversation requires a value");
      }
      conversationId = Number.parseInt(val, 10);
      if (!Number.isFinite(conversationId) || conversationId <= 0) {
        throw new Error("--conversation must be a positive integer");
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

  return { conversationId, limit, json };
}

function parseClearArgs(args: readonly string[]): number | undefined {
  let conversationId: number | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--conversation") {
      const val = args[i + 1];
      if (!val) {
        throw new Error("--conversation requires a value");
      }
      conversationId = Number.parseInt(val, 10);
      if (!Number.isFinite(conversationId) || conversationId <= 0) {
        throw new Error("--conversation must be a positive integer");
      }
      i += 1;
      continue;
    }
    if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  return conversationId;
}

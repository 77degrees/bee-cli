import type { Command, CommandContext } from "@/commands/types";
import { printJson, requestClientJson } from "@/client/clientApi";
import { getDatabase } from "@/db/database";
import {
  listProfiles,
  getProfileByName,
  createProfile,
  deleteProfile,
  assignSpeaker,
  getAssignmentsForProfile,
} from "@/db/speakerRepo";
import { getAllFingerprints, upsertFingerprint } from "@/db/styleRepo";
import { requireAiProvider } from "@/ai/provider";
import { analyzeSpeakerFingerprint, identifySpeakers } from "@/ai/speakerAnalyzer";

const USAGE = [
  "bee speakers list [--json]",
  "bee speakers create --name <name> [--notes <notes>]",
  "bee speakers delete <name>",
  "bee speakers assign <conversation_id> <speaker_label> <profile_name>",
  "bee speakers identify <conversation_id> [--json]",
  "bee speakers learn [--profile <name>] [--limit N]",
].join("\n");

export const speakersCommand: Command = {
  name: "speakers",
  description: "Manage speaker profiles and identification.",
  usage: USAGE,
  run: async (args, context) => {
    if (args.length === 0) {
      throw new Error("Missing subcommand. Use list, create, delete, assign, identify, or learn.");
    }

    const [subcommand, ...rest] = args;
    switch (subcommand) {
      case "list":
        handleList(rest);
        return;
      case "create":
        handleCreate(rest);
        return;
      case "delete":
        handleDelete(rest);
        return;
      case "assign":
        handleAssign(rest);
        return;
      case "identify":
        await handleIdentify(rest, context);
        return;
      case "learn":
        await handleLearn(rest, context);
        return;
      default:
        throw new Error(`Unknown speakers subcommand: ${subcommand}`);
    }
  },
};

function handleList(args: readonly string[]): void {
  const json = parseJsonFlag(args);
  const db = getDatabase();
  const profiles = listProfiles(db);
  const fingerprints = getAllFingerprints(db);

  if (json) {
    printJson(
      profiles.map((p) => {
        const fp = fingerprints.find((f) => f.profile_id === p.id);
        return {
          ...p,
          fingerprint: fp
            ? { vocabulary: fp.vocabulary, topics: fp.topics, patterns: fp.patterns, sample_count: fp.sample_count }
            : null,
        };
      })
    );
    return;
  }

  if (profiles.length === 0) {
    console.log("No speaker profiles. Create one with: bee speakers create --name <name>");
    return;
  }

  console.log("# Speaker Profiles\n");
  for (const profile of profiles) {
    const fp = fingerprints.find((f) => f.profile_id === profile.id);
    console.log(`## ${profile.name}`);
    if (profile.notes) {
      console.log(`  Notes: ${profile.notes}`);
    }
    if (fp && fp.sample_count > 0) {
      console.log(`  Samples: ${fp.sample_count}`);
      if (fp.topics.length > 0) {
        console.log(`  Topics: ${fp.topics.join(", ")}`);
      }
    } else {
      console.log("  No fingerprint data. Run: bee speakers learn --profile " + profile.name);
    }
    console.log("");
  }
}

function handleCreate(args: readonly string[]): void {
  const { name, notes } = parseCreateArgs(args);
  const db = getDatabase();

  const existing = getProfileByName(db, name);
  if (existing) {
    throw new Error(`Speaker profile "${name}" already exists.`);
  }

  const profile = createProfile(db, name, notes);
  console.log(`Created speaker profile "${profile.name}" (id ${profile.id}).`);
}

function handleDelete(args: readonly string[]): void {
  const name = parsePositional(args, "profile name");
  const db = getDatabase();

  const profile = getProfileByName(db, name);
  if (!profile) {
    throw new Error(`Speaker profile "${name}" not found.`);
  }

  deleteProfile(db, profile.id);
  console.log(`Deleted speaker profile "${name}".`);
}

function handleAssign(args: readonly string[]): void {
  if (args.length < 3) {
    throw new Error("Usage: bee speakers assign <conversation_id> <speaker_label> <profile_name>");
  }

  const conversationId = Number.parseInt(args[0] ?? "", 10);
  if (!Number.isFinite(conversationId) || conversationId <= 0) {
    throw new Error("conversation_id must be a positive integer.");
  }

  const speakerLabel = args[1];
  const profileName = args[2];

  if (!speakerLabel || !profileName) {
    throw new Error("Usage: bee speakers assign <conversation_id> <speaker_label> <profile_name>");
  }

  const db = getDatabase();
  const profile = getProfileByName(db, profileName);
  if (!profile) {
    throw new Error(`Speaker profile "${profileName}" not found. Create it first with: bee speakers create --name ${profileName}`);
  }

  assignSpeaker(db, conversationId, speakerLabel, profile.id, 1.0, "manual");
  console.log(`Assigned ${speakerLabel} in conversation ${conversationId} -> ${profileName}.`);
}

async function handleIdentify(
  args: readonly string[],
  context: CommandContext
): Promise<void> {
  const { id, json } = parseIdentifyArgs(args);
  const provider = requireAiProvider();
  const db = getDatabase();

  const data = await requestClientJson(context, `/v1/conversations/${id}`, { method: "GET" });
  const utterances = extractUtterances(data);

  if (utterances.length === 0) {
    throw new Error("No utterances found in this conversation.");
  }

  const fingerprints = getAllFingerprints(db);
  if (fingerprints.length === 0) {
    throw new Error("No speaker fingerprints available. Run: bee speakers learn --profile <name>");
  }

  const profiles = fingerprints.map((fp) => ({
    name: fp.profile_name,
    vocabulary: fp.vocabulary,
    topics: fp.topics,
    patterns: fp.patterns,
  }));

  const results = await identifySpeakers(provider, utterances, profiles);

  if (json) {
    printJson(results);
    return;
  }

  console.log(`# Speaker Identification - Conversation ${id}\n`);
  for (const result of results) {
    const confidence = (result.confidence * 100).toFixed(0);
    if (result.profile_name) {
      const marker =
        result.confidence >= 0.8 ? "HIGH" : result.confidence >= 0.5 ? "MEDIUM" : "LOW";
      console.log(`  ${result.speaker_label} -> ${result.profile_name} (${confidence}% ${marker})`);

      if (result.confidence >= 0.8) {
        const profile = getProfileByName(db, result.profile_name);
        if (profile) {
          assignSpeaker(db, id, result.speaker_label, profile.id, result.confidence, "ai");
        }
      }
    } else {
      console.log(`  ${result.speaker_label} -> (unknown)`);
    }
  }
}

async function handleLearn(
  args: readonly string[],
  context: CommandContext
): Promise<void> {
  const { profileName, limit } = parseLearnArgs(args);
  const provider = requireAiProvider();
  const db = getDatabase();

  if (profileName) {
    const profile = getProfileByName(db, profileName);
    if (!profile) {
      throw new Error(`Speaker profile "${profileName}" not found.`);
    }

    const assignments = getAssignmentsForProfile(db, profile.id);
    if (assignments.length === 0) {
      throw new Error(`No conversations assigned to "${profileName}". Assign some first with: bee speakers assign ...`);
    }

    console.log(`Learning from ${assignments.length} conversation(s) for "${profileName}"...`);

    const allUtterances: string[] = [];
    for (const assignment of assignments.slice(0, limit)) {
      const data = await requestClientJson(context, `/v1/conversations/${assignment.conversation_id}`, { method: "GET" });
      const utterances = extractUtterances(data);
      const matching = utterances
        .filter((u) => u.speaker === assignment.speaker_label)
        .map((u) => u.text);
      allUtterances.push(...matching);
    }

    if (allUtterances.length === 0) {
      throw new Error(`No utterances found for "${profileName}" in assigned conversations.`);
    }

    const fingerprint = await analyzeSpeakerFingerprint(provider, profileName, allUtterances);
    upsertFingerprint(db, profile.id, fingerprint.vocabulary, fingerprint.topics, fingerprint.patterns, allUtterances.length);

    console.log(`Updated fingerprint for "${profileName}" from ${allUtterances.length} utterance(s).`);
    console.log(`  Topics: ${fingerprint.topics.join(", ") || "(none)"}`);
    console.log(`  Patterns: ${fingerprint.patterns.join(", ") || "(none)"}`);
  } else {
    const profiles = listProfiles(db);
    if (profiles.length === 0) {
      throw new Error("No speaker profiles exist. Create some first.");
    }

    for (const profile of profiles) {
      const assignments = getAssignmentsForProfile(db, profile.id);
      if (assignments.length === 0) {
        console.log(`Skipping "${profile.name}" (no assignments).`);
        continue;
      }

      console.log(`Learning "${profile.name}" from ${assignments.length} conversation(s)...`);

      const allUtterances: string[] = [];
      for (const assignment of assignments.slice(0, limit)) {
        const data = await requestClientJson(context, `/v1/conversations/${assignment.conversation_id}`, { method: "GET" });
        const utterances = extractUtterances(data);
        const matching = utterances
          .filter((u) => u.speaker === assignment.speaker_label)
          .map((u) => u.text);
        allUtterances.push(...matching);
      }

      if (allUtterances.length === 0) {
        console.log(`  No utterances found, skipping.`);
        continue;
      }

      const fingerprint = await analyzeSpeakerFingerprint(provider, profile.name, allUtterances);
      upsertFingerprint(db, profile.id, fingerprint.vocabulary, fingerprint.topics, fingerprint.patterns, allUtterances.length);
      console.log(`  Updated from ${allUtterances.length} utterance(s).`);
    }
  }
}

function extractUtterances(data: unknown): Array<{ speaker: string; text: string }> {
  if (!data || typeof data !== "object") {
    return [];
  }
  const payload = data as { conversation?: { transcriptions?: Array<{ utterances?: Array<{ speaker?: string; text?: string }> }> } };
  const conversation = payload.conversation;
  if (!conversation?.transcriptions) {
    return [];
  }

  const nonRealtime = conversation.transcriptions.find(
    (t) => !(t as { realtime?: boolean }).realtime
  );
  const transcription = nonRealtime ?? conversation.transcriptions[0];
  if (!transcription?.utterances) {
    return [];
  }

  return transcription.utterances
    .filter((u): u is { speaker: string; text: string } =>
      typeof u.speaker === "string" && typeof u.text === "string"
    )
    .map((u) => ({ speaker: u.speaker, text: u.text }));
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

function parseCreateArgs(args: readonly string[]): { name: string; notes?: string | undefined } {
  let name: string | undefined;
  let notes: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--name") {
      name = args[i + 1];
      if (!name) {
        throw new Error("--name requires a value");
      }
      i += 1;
      continue;
    }
    if (arg === "--notes") {
      notes = args[i + 1];
      if (!notes) {
        throw new Error("--notes requires a value");
      }
      i += 1;
      continue;
    }
    if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (!name) {
    throw new Error("Missing --name.");
  }

  return { name, notes };
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

function parseIdentifyArgs(args: readonly string[]): { id: number; json: boolean } {
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

function parseLearnArgs(args: readonly string[]): { profileName?: string | undefined; limit: number } {
  let profileName: string | undefined;
  let limit = 20;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--profile") {
      profileName = args[i + 1];
      if (!profileName) {
        throw new Error("--profile requires a value");
      }
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      const value = args[i + 1];
      if (!value) {
        throw new Error("--limit requires a value");
      }
      limit = Number.parseInt(value, 10);
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      i += 1;
      continue;
    }
    if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  return { profileName, limit };
}

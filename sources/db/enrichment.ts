import { tryOpenDatabase } from "@/db/database";
import { getAssignmentsForConversation } from "@/db/speakerRepo";
import { getInferencesForConversation } from "@/db/inferenceRepo";
import { getCitationsForFact } from "@/db/citationRepo";

export type SpeakerNameMap = Map<string, string>;

export function resolveSpeakerNames(conversationId: number): SpeakerNameMap {
  const map: SpeakerNameMap = new Map();
  const db = tryOpenDatabase();
  if (!db) {
    return map;
  }
  try {
    const assignments = getAssignmentsForConversation(db, conversationId);
    for (const assignment of assignments) {
      map.set(assignment.speaker_label, assignment.profile_name);
    }
  } catch {
    // DB not available or table missing
  }
  return map;
}

export type InferenceMap = Map<number, string>;

export function resolveInferences(conversationId: number): InferenceMap {
  const map: InferenceMap = new Map();
  const db = tryOpenDatabase();
  if (!db) {
    return map;
  }
  try {
    const inferences = getInferencesForConversation(db, conversationId);
    for (const inference of inferences) {
      map.set(inference.utterance_id, inference.inferred_text);
    }
  } catch {
    // DB not available or table missing
  }
  return map;
}

export function resolveSpeakerLabel(
  speakerNames: SpeakerNameMap,
  rawLabel: string
): string {
  const name = speakerNames.get(rawLabel);
  return name ?? rawLabel;
}

export type CitationInfo = {
  conversation_id: number;
  relevance_score: number;
  snippet: string | null;
};

export function resolveFactCitations(factId: number): CitationInfo[] {
  const db = tryOpenDatabase();
  if (!db) {
    return [];
  }
  try {
    return getCitationsForFact(db, factId).map((c) => ({
      conversation_id: c.conversation_id,
      relevance_score: c.relevance_score,
      snippet: c.snippet,
    }));
  } catch {
    return [];
  }
}

import type { Database } from "bun:sqlite";

export type AiInference = {
  id: number;
  conversation_id: number;
  utterance_id: number;
  original_text: string;
  inferred_text: string;
  confidence: number;
  provider: string;
  model: string;
  created_at: string;
};

export function getInferencesForConversation(
  db: Database,
  conversationId: number
): AiInference[] {
  return db
    .prepare("SELECT * FROM ai_inferences WHERE conversation_id = ? ORDER BY utterance_id")
    .all(conversationId) as AiInference[];
}

export function getInferenceForUtterance(
  db: Database,
  conversationId: number,
  utteranceId: number
): AiInference | null {
  return (
    db
      .prepare("SELECT * FROM ai_inferences WHERE conversation_id = ? AND utterance_id = ?")
      .get(conversationId, utteranceId) as AiInference | null
  ) ?? null;
}

export function upsertInference(
  db: Database,
  conversationId: number,
  utteranceId: number,
  originalText: string,
  inferredText: string,
  confidence: number,
  provider: string,
  model: string
): void {
  db.prepare(
    `INSERT INTO ai_inferences (conversation_id, utterance_id, original_text, inferred_text, confidence, provider, model)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(conversation_id, utterance_id) DO UPDATE SET
       inferred_text = excluded.inferred_text,
       confidence = excluded.confidence,
       provider = excluded.provider,
       model = excluded.model`
  ).run(conversationId, utteranceId, originalText, inferredText, confidence, provider, model);
}

export function clearInferencesForConversation(db: Database, conversationId: number): void {
  db.prepare("DELETE FROM ai_inferences WHERE conversation_id = ?").run(conversationId);
}

export function listAllInferences(db: Database, limit: number): AiInference[] {
  return db
    .prepare("SELECT * FROM ai_inferences ORDER BY created_at DESC LIMIT ?")
    .all(limit) as AiInference[];
}

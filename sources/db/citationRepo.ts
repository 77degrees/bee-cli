import type { Database } from "bun:sqlite";

export type FactCitation = {
  id: number;
  fact_id: number;
  conversation_id: number;
  relevance_score: number;
  snippet: string | null;
  verified: number;
  created_at: string;
};

export function getCitationsForFact(db: Database, factId: number): FactCitation[] {
  return db
    .prepare("SELECT * FROM fact_citations WHERE fact_id = ? ORDER BY relevance_score DESC")
    .all(factId) as FactCitation[];
}

export function upsertCitation(
  db: Database,
  factId: number,
  conversationId: number,
  relevanceScore: number,
  snippet: string | null,
  verified: boolean
): void {
  db.prepare(
    `INSERT INTO fact_citations (fact_id, conversation_id, relevance_score, snippet, verified)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(fact_id, conversation_id) DO UPDATE SET
       relevance_score = excluded.relevance_score,
       snippet = excluded.snippet,
       verified = excluded.verified`
  ).run(factId, conversationId, relevanceScore, snippet, verified ? 1 : 0);
}

export function clearCitationsForFact(db: Database, factId: number): void {
  db.prepare("DELETE FROM fact_citations WHERE fact_id = ?").run(factId);
}

export function clearAllCitations(db: Database): void {
  db.prepare("DELETE FROM fact_citations").run();
}

export function getCitationCount(db: Database): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM fact_citations").get() as { count: number };
  return row.count;
}

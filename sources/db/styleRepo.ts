import type { Database } from "bun:sqlite";

export type StyleFingerprint = {
  id: number;
  profile_id: number;
  vocabulary: string | null;
  topics: string | null;
  patterns: string | null;
  sample_count: number;
  created_at: string;
  updated_at: string;
};

export type ParsedFingerprint = {
  profile_id: number;
  vocabulary: string[];
  topics: string[];
  patterns: string[];
  sample_count: number;
};

export function getFingerprint(db: Database, profileId: number): ParsedFingerprint | null {
  const row = db
    .prepare("SELECT * FROM style_fingerprints WHERE profile_id = ?")
    .get(profileId) as StyleFingerprint | null;

  if (!row) {
    return null;
  }

  return {
    profile_id: row.profile_id,
    vocabulary: parseJsonArray(row.vocabulary),
    topics: parseJsonArray(row.topics),
    patterns: parseJsonArray(row.patterns),
    sample_count: row.sample_count,
  };
}

export function getAllFingerprints(db: Database): Array<ParsedFingerprint & { profile_name: string }> {
  const rows = db
    .prepare(
      `SELECT sf.*, sp.name as profile_name
       FROM style_fingerprints sf
       JOIN speaker_profiles sp ON sf.profile_id = sp.id`
    )
    .all() as Array<StyleFingerprint & { profile_name: string }>;

  return rows.map((row) => ({
    profile_id: row.profile_id,
    profile_name: row.profile_name,
    vocabulary: parseJsonArray(row.vocabulary),
    topics: parseJsonArray(row.topics),
    patterns: parseJsonArray(row.patterns),
    sample_count: row.sample_count,
  }));
}

export function upsertFingerprint(
  db: Database,
  profileId: number,
  vocabulary: string[],
  topics: string[],
  patterns: string[],
  sampleCount: number
): void {
  db.prepare(
    `INSERT INTO style_fingerprints (profile_id, vocabulary, topics, patterns, sample_count, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(profile_id) DO UPDATE SET
       vocabulary = excluded.vocabulary,
       topics = excluded.topics,
       patterns = excluded.patterns,
       sample_count = excluded.sample_count,
       updated_at = datetime('now')`
  ).run(
    profileId,
    JSON.stringify(vocabulary),
    JSON.stringify(topics),
    JSON.stringify(patterns),
    sampleCount
  );
}

function parseJsonArray(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

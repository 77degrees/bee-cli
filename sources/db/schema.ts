export const SCHEMA_VERSION = 1;

export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS speaker_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS speaker_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  speaker_label TEXT NOT NULL,
  profile_id INTEGER NOT NULL REFERENCES speaker_profiles(id) ON DELETE CASCADE,
  confidence REAL NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(conversation_id, speaker_label)
);

CREATE INDEX IF NOT EXISTS idx_speaker_assignments_profile
  ON speaker_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_speaker_assignments_conversation
  ON speaker_assignments(conversation_id);

CREATE TABLE IF NOT EXISTS style_fingerprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES speaker_profiles(id) ON DELETE CASCADE,
  vocabulary TEXT,
  topics TEXT,
  patterns TEXT,
  sample_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(profile_id)
);

CREATE TABLE IF NOT EXISTS fact_citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL,
  relevance_score REAL NOT NULL DEFAULT 0.0,
  snippet TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(fact_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_citations_fact
  ON fact_citations(fact_id);

CREATE TABLE IF NOT EXISTS ai_inferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  utterance_id INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  inferred_text TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.0,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(conversation_id, utterance_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_inferences_conversation
  ON ai_inferences(conversation_id);

CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  host TEXT,
  port INTEGER,
  username TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

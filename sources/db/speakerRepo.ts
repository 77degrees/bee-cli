import type { Database } from "bun:sqlite";

export type SpeakerProfile = {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SpeakerAssignment = {
  id: number;
  conversation_id: number;
  speaker_label: string;
  profile_id: number;
  confidence: number;
  source: string;
  created_at: string;
};

export function listProfiles(db: Database): SpeakerProfile[] {
  return db.prepare("SELECT * FROM speaker_profiles ORDER BY name").all() as SpeakerProfile[];
}

export function getProfileByName(db: Database, name: string): SpeakerProfile | null {
  return (db.prepare("SELECT * FROM speaker_profiles WHERE name = ?").get(name) as SpeakerProfile | null) ?? null;
}

export function getProfileById(db: Database, id: number): SpeakerProfile | null {
  return (db.prepare("SELECT * FROM speaker_profiles WHERE id = ?").get(id) as SpeakerProfile | null) ?? null;
}

export function createProfile(db: Database, name: string, notes?: string): SpeakerProfile {
  const result = db.prepare(
    "INSERT INTO speaker_profiles (name, notes) VALUES (?, ?)"
  ).run(name, notes ?? null);
  return getProfileById(db, Number(result.lastInsertRowid))!;
}

export function deleteProfile(db: Database, id: number): boolean {
  const result = db.prepare("DELETE FROM speaker_profiles WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getAssignmentsForConversation(
  db: Database,
  conversationId: number
): Array<SpeakerAssignment & { profile_name: string }> {
  return db
    .prepare(
      `SELECT sa.*, sp.name as profile_name
       FROM speaker_assignments sa
       JOIN speaker_profiles sp ON sa.profile_id = sp.id
       WHERE sa.conversation_id = ?`
    )
    .all(conversationId) as Array<SpeakerAssignment & { profile_name: string }>;
}

export function getAssignmentsForProfile(
  db: Database,
  profileId: number
): SpeakerAssignment[] {
  return db
    .prepare("SELECT * FROM speaker_assignments WHERE profile_id = ? ORDER BY conversation_id")
    .all(profileId) as SpeakerAssignment[];
}

export function assignSpeaker(
  db: Database,
  conversationId: number,
  speakerLabel: string,
  profileId: number,
  confidence: number,
  source: string
): void {
  db.prepare(
    `INSERT OR REPLACE INTO speaker_assignments
     (conversation_id, speaker_label, profile_id, confidence, source)
     VALUES (?, ?, ?, ?, ?)`
  ).run(conversationId, speakerLabel, profileId, confidence, source);
}

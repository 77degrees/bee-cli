import type { AiProvider } from "@/ai/types";
import { buildSpeakerFingerprintPrompt, buildSpeakerIdentifyPrompt } from "@/ai/prompts";

export type FingerprintResult = {
  vocabulary: string[];
  topics: string[];
  patterns: string[];
};

export type IdentifyResult = {
  speaker_label: string;
  profile_name: string | null;
  confidence: number;
};

export async function analyzeSpeakerFingerprint(
  provider: AiProvider,
  profileName: string,
  utterances: string[]
): Promise<FingerprintResult> {
  const messages = buildSpeakerFingerprintPrompt(profileName, utterances);
  const result = await provider.complete(messages);
  const parsed = parseJsonResponse<FingerprintResult>(result.content);

  return {
    vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
  };
}

export async function identifySpeakers(
  provider: AiProvider,
  utterances: Array<{ speaker: string; text: string }>,
  profiles: Array<{ name: string; vocabulary: string[]; topics: string[]; patterns: string[] }>
): Promise<IdentifyResult[]> {
  const messages = buildSpeakerIdentifyPrompt(utterances, profiles);
  const result = await provider.complete(messages);
  const parsed = parseJsonResponse<IdentifyResult[]>(result.content);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((item) => ({
    speaker_label: typeof item.speaker_label === "string" ? item.speaker_label : "",
    profile_name: typeof item.profile_name === "string" ? item.profile_name : null,
    confidence: typeof item.confidence === "number" ? item.confidence : 0,
  }));
}

function parseJsonResponse<T>(content: string): T {
  const trimmed = content.trim();
  const jsonStart = trimmed.indexOf("{") >= 0 ? trimmed.indexOf("{") : trimmed.indexOf("[");
  const jsonEnd = trimmed.lastIndexOf("}") >= 0 ? trimmed.lastIndexOf("}") + 1 : trimmed.lastIndexOf("]") + 1;

  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error("AI response did not contain valid JSON.");
  }

  const jsonStr = trimmed.slice(jsonStart, jsonEnd);
  return JSON.parse(jsonStr) as T;
}

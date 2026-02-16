import type { AiProvider, AiResult } from "@/ai/types";
import { buildGapFillingPrompt } from "@/ai/prompts";

export type GapFillResult = {
  utterance_id: number;
  inferred_text: string;
  confidence: number;
  reasoning: string;
};

export type GapFillResponse = {
  results: GapFillResult[];
  model: string;
  provider: string;
};

export async function fillTranscriptGaps(
  provider: AiProvider,
  conversationContext: string,
  unclearUtterances: Array<{ id: number; speaker: string; text: string }>,
  speakerInfo?: string
): Promise<GapFillResponse> {
  const messages = buildGapFillingPrompt(conversationContext, unclearUtterances, speakerInfo);
  const result: AiResult = await provider.complete(messages);
  const parsed = parseJsonResponse<GapFillResult[]>(result.content);

  const results: GapFillResult[] = Array.isArray(parsed)
    ? parsed.map((item) => ({
        utterance_id: typeof item.utterance_id === "number" ? item.utterance_id : 0,
        inferred_text: typeof item.inferred_text === "string" ? item.inferred_text : "",
        confidence: typeof item.confidence === "number" ? item.confidence : 0,
        reasoning: typeof item.reasoning === "string" ? item.reasoning : "",
      }))
    : [];

  return {
    results,
    model: result.model,
    provider: result.provider,
  };
}

const MIN_WORD_COUNT = 3;
const MAX_WORD_LENGTH_AVG = 4;

export function isUnclearUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return true;
  }

  const words = trimmed.split(/\s+/);
  if (words.length < MIN_WORD_COUNT) {
    return true;
  }

  const avgLen = trimmed.length / words.length;
  if (avgLen < MAX_WORD_LENGTH_AVG && words.length < 5) {
    return true;
  }

  return false;
}

function parseJsonResponse<T>(content: string): T {
  const trimmed = content.trim();
  const jsonStart = trimmed.indexOf("[") >= 0 ? trimmed.indexOf("[") : trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("]") >= 0 ? trimmed.lastIndexOf("]") + 1 : trimmed.lastIndexOf("}") + 1;

  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error("AI response did not contain valid JSON.");
  }

  return JSON.parse(trimmed.slice(jsonStart, jsonEnd)) as T;
}

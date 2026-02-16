import type { AiProvider } from "@/ai/types";
import { buildCitationMatchPrompt } from "@/ai/prompts";

export type CitationVerification = {
  relevant: boolean;
  relevance_score: number;
  snippet: string | null;
};

export async function verifyCitation(
  provider: AiProvider,
  factText: string,
  conversationTranscript: string,
  conversationId: number
): Promise<CitationVerification> {
  const messages = buildCitationMatchPrompt(factText, conversationTranscript, conversationId);
  const result = await provider.complete(messages);
  const parsed = parseJsonResponse<CitationVerification>(result.content);

  return {
    relevant: typeof parsed.relevant === "boolean" ? parsed.relevant : false,
    relevance_score: typeof parsed.relevance_score === "number" ? parsed.relevance_score : 0,
    snippet: typeof parsed.snippet === "string" ? parsed.snippet : null,
  };
}

function parseJsonResponse<T>(content: string): T {
  const trimmed = content.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}") + 1;

  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error("AI response did not contain valid JSON.");
  }

  return JSON.parse(trimmed.slice(jsonStart, jsonEnd)) as T;
}

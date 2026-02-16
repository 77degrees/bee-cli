import type { AiMessage } from "@/ai/types";

export function buildSpeakerFingerprintPrompt(
  profileName: string,
  utterances: string[]
): AiMessage[] {
  return [
    {
      role: "system",
      content: `You are an expert linguistic analyst. Analyze speech patterns to build a speaker fingerprint.
Return a JSON object with these fields:
- vocabulary: array of distinctive words/phrases this person uses frequently
- topics: array of topics this person frequently discusses
- patterns: array of speech patterns (e.g., "uses filler words", "tends to ask rhetorical questions", "speaks in short sentences")

Return ONLY valid JSON, no markdown or explanation.`,
    },
    {
      role: "user",
      content: `Analyze the following utterances from "${profileName}" and build a speech fingerprint.\n\nUtterances:\n${utterances.map((u, i) => `${i + 1}. ${u}`).join("\n")}`,
    },
  ];
}

export function buildSpeakerIdentifyPrompt(
  utterances: Array<{ speaker: string; text: string }>,
  profiles: Array<{ name: string; vocabulary: string[]; topics: string[]; patterns: string[] }>
): AiMessage[] {
  const profileDescriptions = profiles
    .map(
      (p) =>
        `- ${p.name}: vocabulary=[${p.vocabulary.join(", ")}], topics=[${p.topics.join(", ")}], patterns=[${p.patterns.join(", ")}]`
    )
    .join("\n");

  const utteranceList = utterances
    .map((u) => `[${u.speaker}]: ${u.text}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You are an expert at identifying speakers based on their speech patterns.
Given a list of known speaker profiles and a conversation transcript with generic speaker labels, match each speaker label to the most likely profile.

Return a JSON array of objects with these fields:
- speaker_label: the generic label (e.g., "speaker_1")
- profile_name: the matched profile name, or null if no confident match
- confidence: number between 0 and 1

Return ONLY valid JSON, no markdown or explanation.`,
    },
    {
      role: "user",
      content: `Known profiles:\n${profileDescriptions}\n\nConversation:\n${utteranceList}`,
    },
  ];
}

export function buildGapFillingPrompt(
  conversationContext: string,
  unclearUtterances: Array<{ id: number; speaker: string; text: string }>,
  speakerInfo?: string
): AiMessage[] {
  const unclearList = unclearUtterances
    .map((u) => `[ID ${u.id}] [${u.speaker}]: "${u.text}"`)
    .join("\n");

  const speakerContext = speakerInfo ? `\nSpeaker context: ${speakerInfo}\n` : "";

  return [
    {
      role: "system",
      content: `You are an expert at interpreting unclear or garbled speech transcriptions.
Given conversation context and unclear utterances, suggest what the speaker most likely said.

Return a JSON array of objects with these fields:
- utterance_id: the ID of the unclear utterance
- inferred_text: your best interpretation of what was said
- confidence: number between 0 and 1 (how confident you are)
- reasoning: brief explanation

Return ONLY valid JSON, no markdown or explanation.`,
    },
    {
      role: "user",
      content: `Conversation context:\n${conversationContext}\n${speakerContext}\nUnclear utterances:\n${unclearList}`,
    },
  ];
}

export function buildCitationMatchPrompt(
  factText: string,
  conversationTranscript: string,
  conversationId: number
): AiMessage[] {
  return [
    {
      role: "system",
      content: `You are verifying whether a conversation supports a given fact.
Analyze the conversation and determine:
1. Whether it contains evidence supporting the fact
2. The most relevant snippet from the conversation

Return a JSON object with:
- relevant: boolean
- relevance_score: number between 0 and 1
- snippet: the most relevant quote from the conversation (or null if not relevant)

Return ONLY valid JSON, no markdown or explanation.`,
    },
    {
      role: "user",
      content: `Fact: "${factText}"\n\nConversation ${conversationId}:\n${conversationTranscript}`,
    },
  ];
}

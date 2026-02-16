import type { AiProvider, AiMessage, AiResult } from "@/ai/types";

const DEFAULT_MODEL = "gpt-4o";
const API_URL = "https://api.openai.com/v1/chat/completions";

export function createOpenAiProvider(apiKey: string, model?: string): AiProvider {
  const resolvedModel = model ?? DEFAULT_MODEL;

  return {
    name: "openai",
    complete: async (messages: AiMessage[]): Promise<AiResult> => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${text}`);
      }

      const data = await response.json() as OpenAiResponse;
      const choice = data.choices[0];
      if (!choice) {
        throw new Error("OpenAI returned no choices.");
      }

      return {
        content: choice.message.content ?? "",
        model: data.model,
        provider: "openai",
        usage: data.usage
          ? {
              input_tokens: data.usage.prompt_tokens,
              output_tokens: data.usage.completion_tokens,
            }
          : undefined,
      };
    },
  };
}

type OpenAiResponse = {
  model: string;
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
};

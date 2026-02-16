import type { AiProvider, AiMessage, AiResult } from "@/ai/types";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export function createAnthropicProvider(apiKey: string, model?: string): AiProvider {
  const resolvedModel = model ?? DEFAULT_MODEL;

  return {
    name: "anthropic",
    complete: async (messages: AiMessage[]): Promise<AiResult> => {
      const systemMessages = messages.filter((m) => m.role === "system");
      const nonSystemMessages = messages.filter((m) => m.role !== "system");

      const body: Record<string, unknown> = {
        model: resolvedModel,
        max_tokens: 4096,
        messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
      };

      if (systemMessages.length > 0) {
        body["system"] = systemMessages.map((m) => m.content).join("\n\n");
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${text}`);
      }

      const data = await response.json() as AnthropicResponse;
      const textBlock = data.content.find((block) => block.type === "text");
      if (!textBlock) {
        throw new Error("Anthropic returned no text content.");
      }

      return {
        content: textBlock.text,
        model: data.model,
        provider: "anthropic",
        usage: data.usage
          ? {
              input_tokens: data.usage.input_tokens,
              output_tokens: data.usage.output_tokens,
            }
          : undefined,
      };
    },
  };
}

type AnthropicResponse = {
  model: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
};

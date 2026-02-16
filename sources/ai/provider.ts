import type { AiProvider } from "@/ai/types";
import { createOpenAiProvider } from "@/ai/openai";
import { createAnthropicProvider } from "@/ai/anthropic";
import { tryOpenDatabase } from "@/db/database";
import { getConfigValue } from "@/db/configRepo";

export function resolveAiProvider(): AiProvider | null {
  const providerName = resolveValue("ai_provider", "BEE_AI_PROVIDER");
  if (!providerName) {
    return null;
  }

  switch (providerName) {
    case "openai": {
      const apiKey = resolveValue("openai_api_key", "OPENAI_API_KEY");
      if (!apiKey) {
        throw new Error("OpenAI API key not configured. Set via: bee config set openai_api_key <key>");
      }
      const model = resolveValue("openai_model", "OPENAI_MODEL") ?? undefined;
      return createOpenAiProvider(apiKey, model);
    }
    case "anthropic": {
      const apiKey = resolveValue("anthropic_api_key", "ANTHROPIC_API_KEY");
      if (!apiKey) {
        throw new Error("Anthropic API key not configured. Set via: bee config set anthropic_api_key <key>");
      }
      const model = resolveValue("anthropic_model", "ANTHROPIC_MODEL") ?? undefined;
      return createAnthropicProvider(apiKey, model);
    }
    default:
      throw new Error(`Unknown AI provider: ${providerName}. Use "openai" or "anthropic".`);
  }
}

export function requireAiProvider(): AiProvider {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new Error(
      'No AI provider configured. Run:\n  bee config set ai_provider openai\n  bee config set openai_api_key <your-key>'
    );
  }
  return provider;
}

function resolveValue(configKey: string, envVar: string): string | null {
  const envValue = process.env[envVar];
  if (envValue) {
    return envValue;
  }

  const db = tryOpenDatabase();
  if (db) {
    return getConfigValue(db, configKey);
  }

  return null;
}

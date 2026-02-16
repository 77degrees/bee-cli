export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiResult = {
  content: string;
  model: string;
  provider: string;
  usage?: {
    input_tokens?: number | undefined;
    output_tokens?: number | undefined;
  } | undefined;
};

export type AiProvider = {
  name: string;
  complete: (messages: AiMessage[]) => Promise<AiResult>;
};

export type AIProvider = {
  id: string;
  name: string;
  model: string;
  endpoint: string;
  vaultKey: string;
  headers?: Record<string, string>;
};

export const providers: AIProvider[] = [
  {
    id: "claude",
    name: "Anthropic Claude",
    model: "claude-3-opus",
    endpoint: "https://api.anthropic.com/v1/messages",
    vaultKey: "ANTHROPIC_API_KEY"
  },
  {
    id: "openai",
    name: "OpenAI GPT",
    model: "gpt-4.1",
    endpoint: "https://api.openai.com/v1/chat/completions",
    vaultKey: "OPENAI_API_KEY"
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    model: "copilot-gpt",
    endpoint: "https://api.copilot.microsoft.com/v1/chat",
    vaultKey: "COPILOT_API_KEY"
  }
];

export function getProvider(id: string) {
  return providers.find(p => p.id === id) || null;
}

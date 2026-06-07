import { getProvider } from "./providers";
import { loadVault } from "../config/loadVault";

export async function runAI(providerId: string, prompt: string, options: any = {}) {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Unknown AI provider: ${providerId}`);

  const vault = loadVault();
  const apiKey = vault.get(provider.vaultKey);
  if (!apiKey) throw new Error(`Missing API key for provider: ${providerId}`);

  const body = {
    model: provider.model,
    messages: [{ role: "user", content: prompt }],
    ...options
  };

  const res = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(provider.headers || {})
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI provider error: ${text}`);
  }

  const json = await res.json();
  return json;
}

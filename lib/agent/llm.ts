import { keyStore } from "./keystore";

/**
 * Thin LLMProvider interface (L-2, ratified). The single seam every model-driven
 * planner calls — provider-agnostic so BYOK / multi-provider drop in without touching
 * call sites. v1 ships one implementation (OpenAI), resolving its key via the KeyStore
 * (E-3). Returns null on no-key/error so callers can fall back deterministically (L-3).
 */

export interface LLMRequest {
  system: string;
  user: string;
  model?: string;       // per-role model (L-1); defaults to a cost-efficient baseline
  jsonObject?: boolean; // force JSON response
  temperature?: number;
}

/** Token usage for one completion — the metering currency (D-277). */
export interface LLMUsage { tokensIn: number; tokensOut: number; provider: string }
export interface LLMCompletion { text: string | null; usage: LLMUsage | null }

export interface LLMProvider {
  name: string;
  complete(req: LLMRequest, tenantId?: string): Promise<string | null>;
  /** Like complete(), but also returns the provider's reported token usage. */
  completeWithUsage(req: LLMRequest, tenantId?: string): Promise<LLMCompletion>;
}

class OpenAIProvider implements LLMProvider {
  name = "openai";
  async complete(req: LLMRequest, tenantId?: string): Promise<string | null> {
    return (await this.completeWithUsage(req, tenantId)).text;
  }
  async completeWithUsage(req: LLMRequest, tenantId?: string): Promise<LLMCompletion> {
    const key = await keyStore.resolve("openai", tenantId);
    if (!key) return { text: null, usage: null }; // -> caller falls back (L-3)
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: req.model ?? "gpt-4o-mini",
          temperature: req.temperature ?? 0.4,
          ...(req.jsonObject ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
        }),
      });
      if (!res.ok) return { text: null, usage: null };
      const j = await res.json();
      const text = j.choices?.[0]?.message?.content;
      const usage = j.usage ? { tokensIn: j.usage.prompt_tokens ?? 0, tokensOut: j.usage.completion_tokens ?? 0, provider: this.name } : null;
      return { text: typeof text === "string" ? text : null, usage };
    } catch {
      return { text: null, usage: null };
    }
  }
}

class GeminiProvider implements LLMProvider {
  name = "gemini";
  async complete(req: LLMRequest, tenantId?: string): Promise<string | null> {
    return (await this.completeWithUsage(req, tenantId)).text;
  }
  async completeWithUsage(req: LLMRequest, tenantId?: string): Promise<LLMCompletion> {
    const key = await keyStore.resolve("gemini", tenantId);
    if (!key) return { text: null, usage: null };
    try {
      const model = req.model && /gemini/i.test(req.model) ? req.model : "gemini-2.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.user }] }],
          generationConfig: {
            temperature: req.temperature ?? 0.4,
            ...(req.jsonObject ? { responseMimeType: "application/json" } : {}),
          },
        }),
      });
      if (!res.ok) return { text: null, usage: null };
      const j = await res.json();
      const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("");
      const um = j.usageMetadata;
      const usage = um ? { tokensIn: um.promptTokenCount ?? 0, tokensOut: um.candidatesTokenCount ?? 0, provider: this.name } : null;
      return { text: typeof text === "string" && text.trim() ? text : null, usage };
    } catch {
      return { text: null, usage: null };
    }
  }
}

/** Provider CHAIN (L-3): try each in order, first non-null answer wins. OpenAI stays
 *  primary; Gemini picks up when OpenAI has no key or errors — found live 2026-06-12
 *  when the platform OpenAI key hit insufficient_quota and every LLM feature was
 *  silently falling back to deterministic mode. */
class ChainProvider implements LLMProvider {
  name = "chain(openai>gemini)";
  private providers: LLMProvider[] = [new OpenAIProvider(), new GeminiProvider()];
  async complete(req: LLMRequest, tenantId?: string): Promise<string | null> {
    return (await this.completeWithUsage(req, tenantId)).text;
  }
  async completeWithUsage(req: LLMRequest, tenantId?: string): Promise<LLMCompletion> {
    for (const p of this.providers) {
      const out = await p.completeWithUsage(req, tenantId);
      if (out.text != null) return out;
    }
    return { text: null, usage: null };
  }
}

export const llm: LLMProvider = new ChainProvider();

export const stripFences = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

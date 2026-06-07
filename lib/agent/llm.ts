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

export interface LLMProvider {
  name: string;
  complete(req: LLMRequest, tenantId?: string): Promise<string | null>;
}

class OpenAIProvider implements LLMProvider {
  name = "openai";
  async complete(req: LLMRequest, tenantId?: string): Promise<string | null> {
    const key = await keyStore.resolve("openai", tenantId);
    if (!key) return null; // -> caller falls back (L-3)
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
      if (!res.ok) return null;
      const j = await res.json();
      const text = j.choices?.[0]?.message?.content;
      return typeof text === "string" ? text : null;
    } catch {
      return null;
    }
  }
}

export const llm: LLMProvider = new OpenAIProvider();

export const stripFences = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

import "server-only";

/**
 * Provider-neutral AI call. The provider and model come only from server
 * environment variables; nothing is guessed. Keys never leave the server and
 * are never logged.
 */
export type AIErrorCode = "not_configured" | "timeout" | "rate_limit" | "provider_error" | "invalid_output";

export class AIError extends Error {
  constructor(public code: AIErrorCode, message: string) {
    super(message);
  }
}

export type AIConfig = { provider: "anthropic" | "openai"; model: string; apiKey: string; baseUrl?: string; timeoutMs: number };

export function aiConfig(): AIConfig | null {
  const provider = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  const model = (process.env.AI_MODEL || "").trim();
  const apiKey = (process.env.AI_API_KEY || "").trim();
  if (!provider || !model || !apiKey) return null;
  if (provider !== "anthropic" && provider !== "openai") return null;
  const timeoutMs = Math.max(10, Number(process.env.AI_TIMEOUT_SECONDS || 90)) * 1000;
  return { provider, model, apiKey, baseUrl: process.env.AI_BASE_URL?.trim() || undefined, timeoutMs };
}

/** Public description for the settings page (no secrets). */
export function aiStatus() {
  const c = aiConfig();
  return c ? { configured: true as const, provider: c.provider, model: c.model } : { configured: false as const };
}

async function once(c: AIConfig, system: string, user: string, maxTokens: number): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), c.timeoutMs);
  try {
    let res: Response;
    if (c.provider === "anthropic") {
      res = await fetch(`${c.baseUrl || "https://api.anthropic.com"}/v1/messages`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", "x-api-key": c.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: c.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
      });
    } else {
      res = await fetch(`${c.baseUrl || "https://api.openai.com/v1"}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${c.apiKey}` },
        body: JSON.stringify({
          model: c.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
    }
    if (res.status === 429) throw new AIError("rate_limit", "Provider rate limit");
    if (!res.ok) throw new AIError("provider_error", `Provider returned ${res.status}`);
    const json = (await res.json()) as Record<string, unknown>;
    const text =
      c.provider === "anthropic"
        ? ((json.content as { type: string; text?: string }[]) ?? []).filter((b) => b.type === "text").map((b) => b.text).join("")
        : ((json.choices as { message: { content: string } }[])?.[0]?.message?.content ?? "");
    if (!text) throw new AIError("invalid_output", "Empty response");
    return text;
  } catch (e) {
    if (e instanceof AIError) throw e;
    if ((e as Error).name === "AbortError") throw new AIError("timeout", "AI request timed out");
    throw new AIError("provider_error", "Could not reach the AI provider");
  } finally {
    clearTimeout(timer);
  }
}

/** One logical request. Retries only on rate limit / transient errors, at most twice. */
export async function callAI(system: string, user: string, maxTokens = 8000): Promise<string> {
  const c = aiConfig();
  if (!c) throw new AIError("not_configured", "AI provider is not configured");
  let last: AIError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await once(c, system, user, maxTokens);
    } catch (e) {
      last = e as AIError;
      if (last.code === "timeout" || last.code === "invalid_output") break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw last ?? new AIError("provider_error", "Unknown error");
}

/** Take the JSON object out of a model reply (tolerates code fences or text around it). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new AIError("invalid_output", "No JSON in response");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AIError("invalid_output", "Response JSON could not be parsed");
  }
}

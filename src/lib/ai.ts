import "server-only";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPreset, type AiStatus } from "@/lib/ai-providers";

export type AiConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
};

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

const SETTINGS_KEY = "ai";

export async function getStoredAiConfig(): Promise<AiConfig | null> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SETTINGS_KEY))
    .limit(1);
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<AiConfig>;
    if (typeof parsed.apiKey === "string" && parsed.apiKey) {
      return {
        provider: parsed.provider ?? "custom",
        baseUrl: parsed.baseUrl ?? "",
        model: parsed.model ?? "",
        apiKey: parsed.apiKey,
      };
    }
  } catch {
    /* corrupt row — treat as unset */
  }
  return null;
}

/** Saved config first, then environment variables as a fallback. */
export async function getAiConfig(): Promise<{ config: AiConfig; source: "database" | "env" } | null> {
  const stored = await getStoredAiConfig();
  if (stored) return { config: stored, source: "database" };

  const envKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (envKey) {
    const provider = process.env.AI_PROVIDER ?? "openai";
    const preset = getPreset(provider);
    return {
      config: {
        provider,
        baseUrl: process.env.AI_BASE_URL ?? preset.baseUrl,
        model: process.env.AI_MODEL ?? preset.model,
        apiKey: envKey,
      },
      source: "env",
    };
  }
  return null;
}

export function maskKey(key: string): string {
  if (key.length <= 10) return "••••••";
  return `${key.slice(0, 5)}••••${key.slice(-4)}`;
}

export async function getAiStatus(): Promise<AiStatus> {
  const found = await getAiConfig();
  if (!found) {
    return {
      configured: false,
      source: null,
      provider: "openai",
      providerLabel: getPreset("openai").label,
      baseUrl: getPreset("openai").baseUrl,
      model: getPreset("openai").model,
      keyPreview: null,
    };
  }
  const { config, source } = found;
  return {
    configured: true,
    source,
    provider: config.provider,
    providerLabel: getPreset(config.provider).label,
    baseUrl: config.baseUrl,
    model: config.model,
    keyPreview: maskKey(config.apiKey),
  };
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  const value = JSON.stringify(config);
  await db
    .insert(appSettings)
    .values({ key: SETTINGS_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function clearAiConfig(): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, SETTINGS_KEY));
}

/* ---------------- provider request helpers ---------------- */

export function completionsUrl(baseUrl: string): string {
  return `${baseUrl.trim().replace(/\/+$/, "")}/chat/completions`;
}

export function requestInit(
  config: AiConfig,
  messages: ChatTurn[],
  opts: { stream: boolean; signal?: AbortSignal },
): RequestInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.provider === "openrouter") {
    headers["X-Title"] = "StudyX";
  }
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: opts.stream,
  };
  // Anthropic's OpenAI-compatible endpoint requires an explicit token limit.
  if (config.provider === "anthropic") body.max_tokens = 4096;

  return {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
    cache: "no-store",
  };
}

/** Turn a provider error response into a friendly message. */
export async function readProviderError(res: Response): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const err = Array.isArray(json) ? json[0]?.error : json?.error;
      detail =
        (typeof err === "string" ? err : err?.message) ?? json?.message ?? text.slice(0, 300);
    } catch {
      detail = text.slice(0, 300);
    }
  } catch {
    /* ignore */
  }
  const prefix =
    res.status === 401 || res.status === 403
      ? "The API key was rejected"
      : res.status === 404
        ? "Model or endpoint not found — check the base URL and model name"
        : res.status === 429
          ? "Rate limit or quota exceeded"
          : `Provider error (${res.status})`;
  return detail ? `${prefix}: ${detail}` : prefix;
}

import "server-only";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  MAX_CONNECTIONS,
  MIN_CONNECTIONS,
  getPreset,
  type AiConnection,
  type AiStatus,
} from "@/lib/ai-providers";

export type AiConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
};

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

/** One of the up to five stored connections. */
export type StoredConnection = AiConfig & {
  id: string;
  label: string;
};

type StoredState = {
  activeId: string | null;
  connections: StoredConnection[];
};

const SETTINGS_KEY = "ai";
const LEGACY_KEYS = ["ai", "ai.connections"] as const;

function randomId(): string {
  return `conn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isConfig(value: Partial<AiConfig> | null | undefined): value is AiConfig {
  return Boolean(value && typeof value.apiKey === "string" && value.apiKey);
}

function normalise(raw: unknown): StoredState {
  if (!raw || typeof raw !== "object") return { activeId: null, connections: [] };
  const obj = raw as Record<string, unknown>;

  // Shape written by the first version: a single config object.
  if (isConfig(obj as Partial<AiConfig>)) {
    const single = obj as unknown as AiConfig;
    const connection: StoredConnection = {
      ...single,
      id: randomId(),
      label: getPreset(single.provider).label,
    };
    return { activeId: connection.id, connections: [connection] };
  }

  const list = Array.isArray(obj.connections) ? obj.connections : [];
  const connections: StoredConnection[] = [];
  for (const item of list) {
    if (!isConfig(item as Partial<AiConfig>)) continue;
    const c = item as StoredConnection;
    connections.push({
      id: typeof c.id === "string" && c.id ? c.id : randomId(),
      label: typeof c.label === "string" && c.label ? c.label : getPreset(c.provider).label,
      provider: c.provider || "custom",
      baseUrl: c.baseUrl || getPreset(c.provider).baseUrl,
      model: c.model || getPreset(c.provider).model,
      apiKey: c.apiKey,
    });
    if (connections.length >= MAX_CONNECTIONS) break;
  }
  const activeId =
    typeof obj.activeId === "string" && connections.some((c) => c.id === obj.activeId)
      ? obj.activeId
      : (connections[0]?.id ?? null);
  return { activeId, connections };
}

async function readStored(): Promise<StoredState> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SETTINGS_KEY))
    .limit(1);
  if (!row) return { activeId: null, connections: [] };
  try {
    return normalise(JSON.parse(row.value));
  } catch {
    /* corrupt row — treat as unset */
    return { activeId: null, connections: [] };
  }
}

async function writeStored(state: StoredState): Promise<void> {
  const value = JSON.stringify(state);
  await db
    .insert(appSettings)
    .values({ key: SETTINGS_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

function maskKey(key: string): string {
  if (key.length <= 10) return "••••••";
  return `${key.slice(0, 5)}••••${key.slice(-4)}`;
}

function envConnection(): StoredConnection | null {
  const envKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!envKey) return null;
  const provider = process.env.AI_PROVIDER ?? "openai";
  const preset = getPreset(provider);
  return {
    id: "env",
    label: `${preset.label} (env)`,
    provider,
    baseUrl: process.env.AI_BASE_URL ?? preset.baseUrl,
    model: process.env.AI_MODEL ?? preset.model,
    apiKey: envKey,
  };
}

/** Saved connections first; a single environment-variable key is the fallback. */
async function loadConnections(): Promise<{
  connections: StoredConnection[];
  activeId: string | null;
  source: "database" | "env" | null;
}> {
  const stored = await readStored();
  if (stored.connections.length > 0) {
    return { ...stored, source: "database" };
  }
  const env = envConnection();
  if (env) return { connections: [env], activeId: env.id, source: "env" };
  return { connections: [], activeId: null, source: null };
}

/** The connection chat should use: the active one, else the first. */
export async function getAiConfig(): Promise<{
  config: AiConfig;
  source: "database" | "env";
  connection: StoredConnection;
} | null> {
  const { connections, activeId, source } = await loadConnections();
  if (connections.length === 0 || !source) return null;
  const connection =
    connections.find((c) => c.id === activeId) ?? connections[0];
  const { id: _id, label: _label, ...config } = connection;
  void _id;
  void _label;
  return { config, source, connection };
}

function toPublic(c: StoredConnection, index: number, activeId: string | null): AiConnection {
  return {
    id: c.id,
    provider: c.provider,
    label: c.label || `${getPreset(c.provider).label} #${index + 1}`,
    baseUrl: c.baseUrl,
    model: c.model,
    keyPreview: maskKey(c.apiKey),
    isActive: c.id === (activeId ?? ""),
  };
}

export async function getAiStatus(): Promise<AiStatus> {
  const { connections, activeId, source } = await loadConnections();
  const active =
    connections.find((c) => c.id === activeId) ?? connections[0] ?? null;
  const fallback = getPreset("openai");
  return {
    configured: connections.length >= MIN_CONNECTIONS,
    source,
    activeId: active?.id ?? null,
    provider: active?.provider ?? fallback.id,
    providerLabel: active ? getPreset(active.provider).label : fallback.label,
    baseUrl: active?.baseUrl ?? fallback.baseUrl,
    model: active?.model ?? fallback.model,
    keyPreview: active ? maskKey(active.apiKey) : null,
    connections: connections.map((c, i) => toPublic(c, i, active?.id ?? null)),
    maxConnections: MAX_CONNECTIONS,
    minConnections: MIN_CONNECTIONS,
  };
}

export type ConnectionInput = {
  /** Existing connection to update; omitted when adding a new one. */
  id?: string;
  provider: string;
  label?: string;
  baseUrl: string;
  model: string;
  /** Blank keeps the stored key for an existing connection. */
  apiKey?: string;
};

export type SaveResult =
  | { ok: true; status: AiStatus; connectionId: string }
  | { ok: false; error: string };

export async function saveConnection(input: ConnectionInput): Promise<SaveResult> {
  const stored = await readStored();
  const connectionList = stored.connections;
  const existing = input.id
    ? connectionList.find((c) => c.id === input.id)
    : undefined;

  if (!existing && connectionList.length >= MAX_CONNECTIONS) {
    return {
      ok: false,
      error: `You can connect at most ${MAX_CONNECTIONS} AI providers. Remove one first.`,
    };
  }

  const apiKey = (input.apiKey ?? "").trim() || existing?.apiKey || "";
  if (!apiKey) return { ok: false, error: "API key is required" };

  const preset = getPreset(input.provider);
  const baseUrl = input.baseUrl.trim() || preset.baseUrl;
  const model = input.model.trim() || preset.model;
  const label = (input.label ?? "").trim() || preset.label;

  const connection: StoredConnection = {
    id: existing?.id ?? randomId(),
    label,
    provider: input.provider,
    baseUrl,
    model,
    apiKey,
  };

  const connections = existing
    ? connectionList.map((c) => (c.id === existing.id ? connection : c))
    : [...connectionList, connection];

  await writeStored({
    connections,
    activeId: stored.activeId ?? connection.id,
  });
  return { ok: true, status: await getAiStatus(), connectionId: connection.id };
}

export async function removeConnection(id: string): Promise<SaveResult> {
  const stored = await readStored();
  const remaining = stored.connections.filter((c) => c.id !== id);
  if (remaining.length === stored.connections.length) {
    return { ok: false, error: "That connection no longer exists." };
  }
  await writeStored({
    connections: remaining,
    activeId: stored.activeId === id ? (remaining[0]?.id ?? null) : stored.activeId,
  });
  return { ok: true, status: await getAiStatus(), connectionId: id };
}

/** Point chat at one of the saved connections. */
export async function setActiveConnection(id: string): Promise<SaveResult> {
  const stored = await readStored();
  const connection = stored.connections.find((c) => c.id === id);
  if (!connection) return { ok: false, error: "That connection no longer exists." };
  await writeStored({ connections: stored.connections, activeId: id });
  return { ok: true, status: await getAiStatus(), connectionId: id };
}

export async function clearAiConfig(): Promise<void> {
  await Promise.all(
    LEGACY_KEYS.map((key) => db.delete(appSettings).where(eq(appSettings.key, key))),
  );
}

/** Look up one stored connection by id (used by the "Test" button). */
export async function getAiConfigById(id: string): Promise<AiConfig | null> {
  const { connections } = await loadConnections();
  const found = connections.find((c) => c.id === id);
  if (!found) return null;
  const { id: _id, label: _label, ...config } = found;
  void _id;
  void _label;
  return config;
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

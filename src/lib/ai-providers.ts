/** Client-safe provider presets. All use the OpenAI-compatible /chat/completions API. */
export type ProviderPreset = {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  keyPlaceholder: string;
  keyUrl?: string;
};

export const PROVIDERS: ProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-5",
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    keyPlaceholder: "sk-or-...",
    keyUrl: "https://openrouter.ai/keys",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    model: "sonar",
    keyPlaceholder: "pplx-...",
    keyUrl: "https://www.perplexity.ai/settings/api",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    model: "",
    keyPlaceholder: "Your API key",
  },
];

/** Connections are capped so the settings screen stays usable. */
export const MAX_CONNECTIONS = 5;
/** Chat needs at least this many working connections. */
export const MIN_CONNECTIONS = 1;

export function getPreset(id: string): ProviderPreset {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1];
}

/** One saved API connection (key never leaves the server). */
export type AiConnection = {
  id: string;
  provider: string;
  label: string;
  baseUrl: string;
  model: string;
  keyPreview: string;
  isActive: boolean;
};

/**
 * Safe status object sent to the browser: every connection is described, but
 * only masked key previews are included.
 */
export type AiStatus = {
  configured: boolean;
  source: "database" | "env" | null;
  /** The connection chat currently uses. */
  activeId: string | null;
  provider: string;
  providerLabel: string;
  baseUrl: string;
  model: string;
  keyPreview: string | null;
  /** 0–5 saved connections. */
  connections: AiConnection[];
  maxConnections: number;
  minConnections: number;
};

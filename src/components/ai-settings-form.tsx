"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageSquare,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { PROVIDERS, getPreset, type AiStatus } from "@/lib/ai-providers";

export function AiSettingsForm({ initialStatus }: { initialStatus: AiStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<AiStatus>(initialStatus);
  const [provider, setProvider] = useState(initialStatus.provider);
  const [baseUrl, setBaseUrl] = useState(initialStatus.baseUrl);
  const [model, setModel] = useState(initialStatus.model);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const preset = getPreset(provider);
  const hasSavedKey = status.configured && status.source === "database";

  function chooseProvider(id: string) {
    const p = getPreset(id);
    setProvider(id);
    if (id !== "custom") {
      setBaseUrl(p.baseUrl);
      setModel(p.model);
    }
    setResult(null);
  }

  async function save() {
    setBusy("save");
    setResult(null);
    const res = await fetch("/api/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, baseUrl, model, apiKey }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setResult({ ok: false, text: data.error ?? "Could not save settings." });
      return;
    }
    setStatus(data as AiStatus);
    setApiKey("");
    setResult({ ok: true, text: "Saved. You're ready to chat." });
    router.refresh();
  }

  async function test() {
    setBusy("test");
    setResult(null);
    const res = await fetch("/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, baseUrl, model, apiKey }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Unexpected response" }));
    setBusy(null);
    setResult(
      data.ok
        ? { ok: true, text: `Connection works — ${data.model} replied “${data.reply || "OK"}”.` }
        : { ok: false, text: data.error ?? "Test failed." },
    );
  }

  async function remove() {
    setBusy("remove");
    const res = await fetch("/api/settings/ai", { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (data) setStatus(data as AiStatus);
    setApiKey("");
    setResult({ ok: true, text: "API key removed." });
    router.refresh();
  }

  const canSave = Boolean(model.trim() && baseUrl.trim() && (apiKey.trim() || hasSavedKey));

  return (
    <div className="space-y-6">
      {/* status */}
      <div className="paper-card flex flex-wrap items-center gap-4 p-5">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            status.configured ? "tag-emerald" : "bg-paper-2 text-ink-3"
          }`}
        >
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {status.configured ? "AI connected" : "No AI provider connected"}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink-3">
            {status.configured
              ? `${status.providerLabel} · ${status.model} · key ${status.keyPreview}${
                  status.source === "env" ? " (from environment variable)" : ""
                }`
              : "Add an API key below to enable the Chat tab."}
          </p>
        </div>
        {status.configured && (
          <Link href="/chat" className="btn-primary">
            <MessageSquare className="h-4 w-4" />
            Open chat
          </Link>
        )}
      </div>

      {/* form */}
      <div className="paper-card p-5 sm:p-6">
        <h2 className="text-sm font-medium">Provider</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => chooseProvider(p.id)}
              aria-pressed={provider === p.id}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                provider === p.id
                  ? "border-accent bg-accent/5 font-medium text-ink"
                  : "border-line text-ink-2 hover:bg-paper-2"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label htmlFor="ai-key" className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-2">
              API key
              {preset.keyUrl && (
                <a
                  href={preset.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-normal text-accent hover:underline"
                >
                  Get a key <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </label>
            <div className="relative">
              <input
                id="ai-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasSavedKey
                    ? `Saved: ${status.keyPreview} — leave blank to keep`
                    : preset.keyPlaceholder
                }
                autoComplete="off"
                spellCheck={false}
                className="field pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-ink-3 hover:text-ink"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ai-model" className="mb-1.5 block text-xs font-medium text-ink-2">
                Model
              </label>
              <input
                id="ai-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o-mini"
                spellCheck={false}
                className="field font-mono"
              />
            </div>
            <div>
              <label htmlFor="ai-url" className="mb-1.5 block text-xs font-medium text-ink-2">
                Base URL
              </label>
              <input
                id="ai-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                spellCheck={false}
                className="field font-mono"
              />
            </div>
          </div>
        </div>

        {result && (
          <p
            className={`mt-5 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
              result.ok ? "tag-emerald" : "tag-rose"
            }`}
            role="status"
          >
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="break-words">{result.text}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={save} disabled={!canSave || busy !== null} className="btn-primary">
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
          <button
            type="button"
            onClick={test}
            disabled={busy !== null || !(apiKey.trim() || status.configured)}
            className="btn-ghost"
          >
            {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Test connection
          </button>
          {hasSavedKey && (
            <button
              type="button"
              onClick={remove}
              disabled={busy !== null}
              className="btn-ghost ml-auto hover:!text-rose-600"
            >
              {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove key
            </button>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-3">
        Your key is stored in this app&apos;s database and is only used on the server to
        call the provider — it is never sent back to the browser. Any OpenAI-compatible
        API works: choose <em>Custom</em> and enter its base URL. You can also set{" "}
        <code className="rounded bg-paper-2 px-1">AI_API_KEY</code> (plus optional{" "}
        <code className="rounded bg-paper-2 px-1">AI_PROVIDER</code>,{" "}
        <code className="rounded bg-paper-2 px-1">AI_BASE_URL</code>,{" "}
        <code className="rounded bg-paper-2 px-1">AI_MODEL</code>) as environment variables.
      </p>
    </div>
  );
}

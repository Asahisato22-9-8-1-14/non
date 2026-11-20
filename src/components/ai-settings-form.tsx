"use client";

import { useMemo, useState } from "react";
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
  Plus,
  Star,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { PROVIDERS, getPreset, type AiConnection, type AiStatus } from "@/lib/ai-providers";

type Busy = "save" | "test" | "remove" | "activate" | "clear" | null;

function maskId(id: string): string {
  return id === "env" ? "env" : id.slice(-4);
}

export function AiSettingsForm({ initialStatus }: { initialStatus: AiStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<AiStatus>(initialStatus);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(initialStatus.connections.length === 0);
  const [provider, setProvider] = useState("openai");
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState(getPreset("openai").baseUrl);
  const [model, setModel] = useState(getPreset("openai").model);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const preset = getPreset(provider);
  const connections = status.connections;
  const atLimit = connections.length >= status.maxConnections;
  const editing = useMemo(
    () => connections.find((c) => c.id === editingId) ?? null,
    [connections, editingId],
  );

  function resetForm() {
    setEditingId(null);
    setProvider("openai");
    setLabel("");
    setBaseUrl(getPreset("openai").baseUrl);
    setModel(getPreset("openai").model);
    setApiKey("");
    setShowKey(false);
    setResult(null);
  }

  function startAdd() {
    resetForm();
    setAdding(true);
  }

  function startEdit(c: AiConnection) {
    setAdding(false);
    setEditingId(c.id);
    setProvider(c.provider);
    setLabel(c.label);
    setBaseUrl(c.baseUrl);
    setModel(c.model);
    setApiKey("");
    setShowKey(false);
    setResult(null);
  }

  function chooseProvider(id: string) {
    setProvider(id);
    if (id !== "custom") {
      const p = getPreset(id);
      setBaseUrl(p.baseUrl);
      setModel(p.model);
      if (!label.trim()) setLabel(p.label);
    }
    setResult(null);
  }

  async function save() {
    setBusy("save");
    setResult(null);
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch("/api/settings/ai", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId ?? undefined, provider, label, baseUrl, model, apiKey }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setResult({ ok: false, text: data.error ?? "Could not save this connection." });
      return;
    }
    setStatus(data as AiStatus);
    setResult({
      ok: true,
      text: editingId
        ? "Connection updated."
        : `Connection saved (${connections.length + 1} of ${status.maxConnections}). You're ready to chat.`,
    });
    resetForm();
    setAdding(false);
    router.refresh();
  }

  async function test() {
    setBusy("test");
    setResult(null);
    const res = await fetch("/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId ?? undefined,
        provider,
        baseUrl,
        model,
        apiKey: apiKey || undefined,
      }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Unexpected response" }));
    setBusy(null);
    setResult(
      data.ok
        ? { ok: true, text: `Connection works — ${data.model} replied “${data.reply || "OK"}”.` }
        : { ok: false, text: data.error ?? "Test failed." },
    );
  }

  async function activate(id: string) {
    setBusy("activate");
    const res = await fetch("/api/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setResult({ ok: false, text: data.error ?? "Could not switch provider." });
      return;
    }
    setStatus(data as AiStatus);
    setResult({ ok: true, text: "Chat will use this connection." });
    router.refresh();
  }

  async function remove(id: string) {
    setBusy("remove");
    const res = await fetch(`/api/settings/ai?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setResult({ ok: false, text: data.error ?? "Could not remove this connection." });
      return;
    }
    setStatus(data as AiStatus);
    setResult({ ok: true, text: "Connection removed." });
    if (editingId === id) resetForm();
    if ((data as AiStatus).connections.length === 0) setAdding(true);
    router.refresh();
  }

  async function clearAll() {
    setBusy("clear");
    const res = await fetch("/api/settings/ai", { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (data) setStatus(data as AiStatus);
    resetForm();
    setAdding(true);
    setResult({ ok: true, text: "All saved keys removed." });
    router.refresh();
  }

  const canSave = Boolean(
    model.trim() && baseUrl.trim() && (apiKey.trim() || editingId !== null),
  );

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
            {status.configured
              ? `AI connected · ${connections.length} of ${status.maxConnections} providers`
              : "No AI provider connected"}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink-3">
            {status.configured
              ? `Chat uses ${status.providerLabel} · ${status.model}${
                  status.source === "env" ? " (from environment variable)" : ""
                }`
              : `Add your first API key below to enable the Chat tab (${status.minConnections}–${status.maxConnections} allowed).`}
          </p>
        </div>
        {status.configured && (
          <Link href="/chat" className="btn-primary">
            <MessageSquare className="h-4 w-4" />
            Open chat
          </Link>
        )}
      </div>

      {/* saved connections */}
      <div className="paper-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Your connections</h2>
            <p className="mt-0.5 text-xs text-ink-3">
              At least {status.minConnections}, at most {status.maxConnections}. Keys are stored
              server-side and shown only as a masked preview.
            </p>
          </div>
          <button
            type="button"
            onClick={startAdd}
            disabled={atLimit || busy !== null}
            className="btn-ghost"
            title={atLimit ? `Limit is ${status.maxConnections} connections` : "Add a provider"}
          >
            <Plus className="h-4 w-4" />
            Add provider
          </button>
        </div>

        {connections.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">
            No connections yet. Add OpenAI, Claude, Gemini, OpenRouter, Groq or any
            OpenAI-compatible endpoint below.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {connections.map((c, index) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 bg-paper px-4 py-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-2 text-[11px] font-semibold text-ink-2">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {c.label}
                    {c.isActive && (
                      <span className="tag-emerald inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium">
                        <Star className="h-2.5 w-2.5" /> in use
                      </span>
                    )}
                    {c.id === "env" && (
                      <span className="tag-sky rounded px-1.5 py-0.5 text-[10px]">env</span>
                    )}
                  </p>
                  <p className="truncate font-mono text-xs text-ink-3">
                    {getPreset(c.provider).label} · {c.model} · {c.keyPreview} · #{maskId(c.id)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {!c.isActive && c.id !== "env" && (
                    <button
                      type="button"
                      onClick={() => activate(c.id)}
                      disabled={busy !== null}
                      className="btn-ghost h-8 px-2 text-xs"
                      title="Use this connection in chat"
                    >
                      {busy === "activate" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Star className="h-3.5 w-3.5" />
                      )}
                      Use
                    </button>
                  )}
                  {c.id !== "env" && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        disabled={busy !== null}
                        className="btn-ghost h-8 px-2 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        disabled={busy !== null}
                        className="btn-icon h-8 w-8 text-ink-3 hover:!text-rose-600"
                        aria-label={`Remove ${c.label}`}
                      >
                        {busy === "remove" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {atLimit && (
          <p className="mt-3 text-xs text-ink-3">
            Limit reached — {status.maxConnections} connections saved. Remove one to add
            another.
          </p>
        )}
      </div>

      {/* add / edit form */}
      {(adding || editing) && (
        <div className="paper-card p-5 sm:p-6">
          <h2 className="text-sm font-medium">
            {editing ? `Edit ${editing.label}` : "Connect a provider"}
          </h2>
          <p className="mt-0.5 text-xs text-ink-3">
            Pick a preset or choose Custom for any OpenAI-compatible API.
          </p>

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
              <label
                htmlFor="ai-key"
                className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-2"
              >
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
                    editing
                      ? `Saved: ${editing.keyPreview} — leave blank to keep`
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

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="ai-label" className="mb-1.5 block text-xs font-medium text-ink-2">
                  Name (optional)
                </label>
                <input
                  id="ai-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={preset.label}
                  className="field"
                />
              </div>
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
            <button
              type="button"
              onClick={save}
              disabled={!canSave || busy !== null}
              className="btn-primary"
            >
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Connect"}
            </button>
            <button
              type="button"
              onClick={test}
              disabled={busy !== null || !(apiKey.trim() || editing)}
              className="btn-ghost"
            >
              {busy === "test" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Test connection
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setAdding(false);
              }}
              disabled={busy !== null}
              className="btn-ghost ml-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status.source === "database" && connections.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          disabled={busy !== null}
          className="btn-ghost text-xs"
        >
          {busy === "clear" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Remove all saved keys
        </button>
      )}

      <p className="text-xs leading-relaxed text-ink-3">
        You can connect <strong>1 to {status.maxConnections}</strong> providers and switch
        which one chat uses at any time. Keys are stored in this app&apos;s database and used
        only on the server to call the provider — they are never sent back to the browser.
        Any OpenAI-compatible API works: choose <em>Custom</em> and enter its base URL. You
        can also set <code className="rounded bg-paper-2 px-1">AI_API_KEY</code> (plus
        optional <code className="rounded bg-paper-2 px-1">AI_PROVIDER</code>,{" "}
        <code className="rounded bg-paper-2 px-1">AI_BASE_URL</code>,{" "}
        <code className="rounded bg-paper-2 px-1">AI_MODEL</code>) as environment variables.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  Map as MapIcon,
  MessageSquarePlus,
  NotebookPen,
  PanelLeft,
  Paperclip,
  Settings,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { AiStatus } from "@/lib/ai-providers";
import { timeAgo } from "@/lib/format";

type ContextType = "note" | "map";

type Conversation = {
  id: number;
  title: string;
  contextType: ContextType | null;
  contextId: number | null;
  updatedAt: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

type Ctx = { type: ContextType; id: number } | null;

const SUGGESTIONS = [
  { title: "Explain simply", prompt: "Explain this concept simply, then give me one question to check I understood: " },
  { title: "Quiz me", prompt: "Quiz me with 5 questions on the attached material, one at a time. Wait for my answer before the next." },
  { title: "Make flashcards", prompt: "Turn the attached material into 8 high-quality flashcards (Q: … / A: …), one atomic idea each." },
  { title: "Build a study plan", prompt: "Help me build a 1-week study plan for: " },
];

export function ChatApp({
  status,
  initialConversations,
  initialConversationId,
  notes,
  maps,
}: {
  status: AiStatus;
  initialConversations: Conversation[];
  initialConversationId: number | null;
  notes: { id: number; title: string }[];
  maps: { id: number; title: string }[];
}) {
  const [convs, setConvs] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<number | null>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draftCtx, setDraftCtx] = useState<Ctx>(null);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; href?: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const skipLoadRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = convs.find((c) => c.id === activeId) ?? null;
  const ctx: Ctx = useMemo(
    () =>
      active
        ? active.contextType && active.contextId != null
          ? { type: active.contextType, id: active.contextId }
          : null
        : draftCtx,
    [active, draftCtx],
  );

  const ctxLabel = useMemo(() => {
    if (!ctx) return null;
    const list = ctx.type === "note" ? notes : maps;
    return list.find((x) => x.id === ctx.id)?.title ?? (ctx.type === "note" ? "Deleted note" : "Deleted map");
  }, [ctx, notes, maps]);

  /* ---------- load messages for the active conversation ---------- */
  useEffect(() => {
    if (activeId == null) {
      // No conversation selected: clear asynchronously so the effect body never
      // calls setState synchronously on mount.
      const id = setTimeout(() => setMessages([]), 0);
      return () => clearTimeout(id);
    }
    if (skipLoadRef.current === activeId) {
      skipLoadRef.current = null;
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/chat/conversations/${activeId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setMessages(
          (data.messages as { id: number; role: string; content: string }[]).map((m) => ({
            id: String(m.id),
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  /* ---------- keep URL in sync without a navigation ---------- */
  useEffect(() => {
    window.history.replaceState(null, "", activeId ? `/chat?c=${activeId}` : "/chat");
  }, [activeId]);

  /* ---------- autoscroll ---------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* ---------- toast auto-hide ---------- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- autosize composer ---------- */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  function newChat() {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setDraftCtx(null);
    setSidebarOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function openConversation(id: number) {
    if (id === activeId) {
      setSidebarOpen(false);
      return;
    }
    abortRef.current?.abort();
    setActiveId(id);
    setSidebarOpen(false);
  }

  async function deleteConversation(id: number) {
    setConvs((cs) => cs.filter((c) => c.id !== id));
    if (id === activeId) {
      abortRef.current?.abort();
      setActiveId(null);
      setMessages([]);
    }
    await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
  }

  async function chooseContext(next: Ctx) {
    setCtxOpen(false);
    if (!active) {
      setDraftCtx(next);
      return;
    }
    setConvs((cs) =>
      cs.map((c) =>
        c.id === active.id
          ? { ...c, contextType: next?.type ?? null, contextId: next?.id ?? null }
          : c,
      ),
    );
    await fetch(`/api/chat/conversations/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextType: next?.type ?? null, contextId: next?.id ?? null }),
    });
  }

  function setAssistant(id: string, content: string, error = false) {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, content, error } : m)));
  }

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || streaming || !status.configured) return;
    setInput("");

    let convId = activeId;
    if (convId == null) {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextType: draftCtx?.type ?? null, contextId: draftCtx?.id ?? null }),
      });
      if (!res.ok) {
        setToast({ text: "Could not start a new chat." });
        setInput(text);
        return;
      }
      const row = await res.json();
      const conv: Conversation = {
        id: row.id,
        title: row.title,
        contextType: row.contextType,
        contextId: row.contextId,
        updatedAt: row.updatedAt,
      };
      skipLoadRef.current = conv.id;
      setConvs((cs) => [conv, ...cs]);
      setActiveId(conv.id);
      setDraftCtx(null);
      convId = conv.id;
    }

    const stamp = Date.now();
    const assistantId = `a-${stamp}`;
    setMessages((ms) => [
      ...ms,
      { id: `u-${stamp}`, role: "user", content: text },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const targetConv = convId;

    try {
      const res = await fetch(`/api/chat/conversations/${targetConv}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setAssistant(assistantId, data.error ?? "Something went wrong.", true);
        return;
      }

      const title = res.headers.get("X-Conversation-Title");
      if (title) {
        const decoded = decodeURIComponent(title);
        setConvs((cs) => cs.map((c) => (c.id === targetConv ? { ...c, title: decoded } : c)));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAssistant(assistantId, acc);
      }
      if (!acc.trim()) setAssistant(assistantId, "The model returned an empty response.", true);
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        setAssistant(assistantId, "Network error — please try again.", true);
      } else {
        setMessages((ms) => ms.filter((m) => !(m.id === assistantId && !m.content)));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      const now = new Date().toISOString();
      setConvs((cs) => {
        const hit = cs.find((c) => c.id === targetConv);
        if (!hit) return cs;
        return [{ ...hit, updatedAt: now }, ...cs.filter((c) => c.id !== targetConv)];
      });
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ text: "Copied to clipboard" });
    } catch {
      setToast({ text: "Could not copy" });
    }
  }

  async function saveAsNote(text: string) {
    const firstLine = text.split("\n").find((l) => l.trim())?.replace(/^#+\s*|[*_`>]/g, "").trim() ?? "";
    const title = firstLine ? firstLine.slice(0, 80) : active?.title ?? "AI chat note";
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: text, subject: "AI chat" }),
    });
    if (!res.ok) {
      setToast({ text: "Could not save note" });
      return;
    }
    const note = await res.json();
    setToast({ text: "Saved to Notes", href: `/notes?note=${note.id}` });
  }

  const showEmpty = !loading && messages.length === 0;

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* ---------------- sidebar ---------------- */}
      {sidebarOpen && (
        <div className="fixed inset-0 top-14 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`absolute inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-paper transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 p-3">
          <button onClick={newChat} className="btn-ghost flex-1 justify-start">
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </button>
          <button onClick={() => setSidebarOpen(false)} className="btn-icon md:hidden" aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {convs.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-3">No conversations yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {convs.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => openConversation(c.id)}
                    className={`w-full cursor-pointer rounded-lg px-3 py-2 pr-9 text-left transition-colors ${
                      c.id === activeId ? "bg-paper-2 text-ink" : "text-ink-2 hover:bg-paper-2/60"
                    }`}
                  >
                    <span className="block truncate text-sm">{c.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-3">
                      {c.contextType === "note" && <NotebookPen className="h-3 w-3" />}
                      {c.contextType === "map" && <MapIcon className="h-3 w-3" />}
                      {timeAgo(c.updatedAt)}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteConversation(c.id)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500 focus:opacity-100"
                    aria-label={`Delete conversation ${c.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-2 border-t border-line px-4 py-3 text-xs text-ink-3 hover:text-ink"
        >
          <Settings className="h-3.5 w-3.5" />
          {status.configured ? `${status.providerLabel} · ${status.model}` : "Connect an AI provider"}
        </Link>
      </aside>

      {/* ---------------- main ---------------- */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4">
          <button onClick={() => setSidebarOpen(true)} className="btn-icon h-8 w-8 md:hidden" aria-label="Open conversations">
            <PanelLeft className="h-4 w-4" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{active?.title ?? "New chat"}</p>

          {/* context picker */}
          <div className="relative">
            <button
              onClick={() => setCtxOpen((o) => !o)}
              className={`inline-flex max-w-[220px] cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                ctx ? "border-accent/40 bg-accent/5 text-ink" : "border-line text-ink-2 hover:bg-paper-2"
              }`}
              aria-haspopup="listbox"
              aria-expanded={ctxOpen}
            >
              {ctx?.type === "map" ? (
                <MapIcon className="h-3.5 w-3.5 shrink-0" />
              ) : ctx?.type === "note" ? (
                <NotebookPen className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{ctxLabel ?? "Add context"}</span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </button>
            {ctxOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCtxOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 max-h-80 w-72 overflow-y-auto rounded-xl border border-line bg-card p-1.5 shadow-pop">
                  <p className="px-2.5 pt-1.5 pb-1 text-[11px] text-ink-3">
                    The AI will read this while answering.
                  </p>
                  <CtxOption active={!ctx} onClick={() => chooseContext(null)} icon={<X className="h-3.5 w-3.5" />} label="No context" />
                  {notes.length > 0 && <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-ink-3">Notes</p>}
                  {notes.map((n) => (
                    <CtxOption
                      key={`n${n.id}`}
                      active={ctx?.type === "note" && ctx.id === n.id}
                      onClick={() => chooseContext({ type: "note", id: n.id })}
                      icon={<NotebookPen className="h-3.5 w-3.5" />}
                      label={n.title || "Untitled note"}
                    />
                  ))}
                  {maps.length > 0 && <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-ink-3">Mind maps</p>}
                  {maps.map((m) => (
                    <CtxOption
                      key={`m${m.id}`}
                      active={ctx?.type === "map" && ctx.id === m.id}
                      onClick={() => chooseContext({ type: "map", id: m.id })}
                      icon={<MapIcon className="h-3.5 w-3.5" />}
                      label={m.title}
                    />
                  ))}
                  {notes.length === 0 && maps.length === 0 && (
                    <p className="px-2.5 py-2 text-xs text-ink-3">Create notes or mind maps to attach them here.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {!status.configured ? (
              <div className="mx-auto mt-16 max-w-md text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line text-ink-2">
                  <KeyRound className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-xl font-semibold tracking-tight">Connect your AI</h2>
                <p className="mt-2 text-sm text-ink-2">
                  Add an API key from OpenAI, Claude, Gemini, OpenRouter, Groq or any
                  OpenAI-compatible provider to start chatting.
                </p>
                <Link href="/settings" className="btn-primary mt-6">
                  <Settings className="h-4 w-4" />
                  Add API key
                </Link>
              </div>
            ) : loading ? (
              <p className="mt-16 text-center text-sm text-ink-3">Loading conversation…</p>
            ) : showEmpty ? (
              <div className="mt-10 sm:mt-16">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">What are we learning today?</h2>
                <p className="mt-1.5 text-sm text-ink-2">
                  Ask anything, or attach a note or mind map with <span className="font-medium">Add context</span> above.
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => {
                        setInput(s.prompt);
                        requestAnimationFrame(() => inputRef.current?.focus());
                      }}
                      className="cursor-pointer rounded-xl border border-line bg-card px-4 py-3 text-left transition-colors hover:bg-paper-2"
                    >
                      <span className="block text-sm font-medium">{s.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-3">{s.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m, i) => {
                  const isLast = i === messages.length - 1;
                  if (m.role === "user") {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-paper-2 px-4 py-2.5 text-[15px] whitespace-pre-wrap">
                          {m.content}
                        </div>
                      </div>
                    );
                  }
                  const typing = streaming && isLast && !m.content;
                  return (
                    <div key={m.id} className="group">
                      {typing ? (
                        <div className="flex gap-1 py-2" aria-label="Assistant is typing">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3 [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3 [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3" />
                        </div>
                      ) : m.error ? (
                        <div className="tag-rose rounded-xl px-4 py-3 text-sm">
                          {m.content}
                          {/key|provider|Settings/i.test(m.content) && (
                            <Link href="/settings" className="ml-2 font-medium underline">
                              Open settings
                            </Link>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="chat-md text-[15px]">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                          </div>
                          {!(streaming && isLast) && (
                            <div className="mt-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                              <MsgAction onClick={() => copy(m.content)} icon={<Copy className="h-3.5 w-3.5" />} label="Copy" />
                              <MsgAction onClick={() => saveAsNote(m.content)} icon={<NotebookPen className="h-3.5 w-3.5" />} label="Save as note" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        {status.configured && (
          <div className="shrink-0 px-4 pb-4 sm:px-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-line bg-card p-2 focus-within:border-accent/60"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={ctxLabel ? `Ask about “${ctxLabel}”…` : "Message your study assistant…"}
                className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] placeholder:text-ink-3 focus:outline-none"
                aria-label="Message"
              />
              {streaming ? (
                <button type="button" onClick={stop} className="btn-icon h-9 w-9 shrink-0" aria-label="Stop generating">
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-ink text-paper transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </form>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-ink-3">
              Enter to send · Shift + Enter for a new line · AI can make mistakes — check important facts.
            </p>
          </div>
        )}
      </section>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-fade-up items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-paper shadow-pop">
          <Check className="h-4 w-4" />
          {toast.text}
          {toast.href && (
            <Link href={toast.href} className="font-medium underline">
              Open
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function CtxOption({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
        active ? "bg-paper-2 font-medium" : "hover:bg-paper-2/60"
      }`}
    >
      <span className="text-ink-3">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {active && <Check className="h-3.5 w-3.5 text-accent" />}
    </button>
  );
}

function MsgAction({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
    >
      {icon}
      {label}
    </button>
  );
}

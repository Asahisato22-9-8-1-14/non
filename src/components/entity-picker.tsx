"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Layers3, Link2, Loader2, NotebookPen, Search, X } from "lucide-react";
import type { DeckPicker, NoteRow } from "@/lib/types";
import { tint } from "@/lib/colors";

type Props = {
  open: boolean;
  onClose: () => void;
  nodeId: number;
  nodeLabel: string;
  decks: DeckPicker[];
  notes: NoteRow[];
  onLinked: () => void;
};

/**
 * From the mind-map side: pick an existing flashcard or note and attach it
 * to the selected concept node.
 */
export function EntityPickerDialog({
  open,
  onClose,
  nodeId,
  nodeLabel,
  decks,
  notes,
  onLinked,
}: Props) {
  const [kind, setKind] = useState<"card" | "note">("card");
  const [deckId, setDeckId] = useState<number | null>(decks[0]?.id ?? null);
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deck = useMemo(
    () => decks.find((d) => d.id === deckId) ?? null,
    [decks, deckId],
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (kind === "card") {
      const list = deck?.cards ?? [];
      return (q ? list.filter((c) => c.front.toLowerCase().includes(q)) : list).map(
        (c) => ({ id: c.id, primary: c.front, secondary: "" }),
      );
    }
    const list = notes.map((n) => ({
      id: n.id,
      primary: n.title,
      secondary: n.content.slice(0, 70),
    }));
    return q
      ? list.filter(
          (n) =>
            n.primary.toLowerCase().includes(q) ||
            n.secondary.toLowerCase().includes(q),
        )
      : list;
  }, [kind, deck, notes, query]);

  useEffect(() => {
    if (!open) return;
    setKind("card");
    setDeckId(decks[0]?.id ?? null);
    setSelected(null);
    setQuery("");
    setError(null);
  }, [open, decks]);

  if (!open) return null;

  async function link() {
    if (selected == null || busy) return;
    setBusy(true);
    setError(null);
    const body =
      kind === "card" ? { nodeId, cardId: selected } : { nodeId, noteId: selected };
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create the link");
      return;
    }
    onLinked();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
      />
      <div className="paper-card relative flex max-h-[92vh] w-full max-w-lg animate-fade-up flex-col overflow-hidden rounded-b-none shadow-pop sm:rounded-b-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-xl leading-tight font-medium">
              Attach to “{nodeLabel.slice(0, 26)}
              {nodeLabel.length > 26 ? "…" : ""}”
            </h3>
            <p className="text-xs text-ink-3">
              Pick study material to connect with this concept.
            </p>
          </div>
          <button onClick={() => !busy && onClose()} className="btn-icon h-8 w-8">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-line bg-paper-2/50 px-4 pt-3">
          {(
            [
              { id: "card", label: "Flashcard", icon: Layers3 },
              { id: "note", label: "Note", icon: NotebookPen },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setKind(t.id);
                setSelected(null);
                setQuery("");
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                kind === t.id ? "bg-card text-accent" : "text-ink-3 hover:text-ink"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {kind === "card" && (
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                Deck
              </label>
              <select
                value={deckId ?? ""}
                onChange={(e) => {
                  setDeckId(Number(e.target.value));
                  setSelected(null);
                }}
                className="field cursor-pointer"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.cards.length} cards)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative mb-3">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={kind === "card" ? "Search cards…" : "Search notes…"}
              className="field pl-9"
            />
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-line bg-paper-2/40 p-2">
            {items.length === 0 ? (
              <p className="p-3 text-center text-xs text-ink-3">
                {kind === "card"
                  ? "No cards found in this deck."
                  : "No notes match your search."}
              </p>
            ) : (
              items.map((item) => {
                const active = selected === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      active ? "bg-card font-semibold shadow-card" : "hover:bg-card/70"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          kind === "card" ? (deck?.color ?? "#4F46E5") : "#E8A33D",
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.primary}</span>
                      {item.secondary && (
                        <span className="block truncate text-xs text-ink-3">
                          {item.secondary}
                        </span>
                      )}
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {error && <p className="px-5 pb-1 text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2.5 border-t border-line px-5 py-4">
          <button onClick={onClose} className="btn-ghost" disabled={busy}>
            Cancel
          </button>
          <button
            onClick={link}
            className="btn-accent"
            disabled={busy || selected == null}
            style={selected == null ? undefined : { backgroundColor: tint("#4A3AFF", 1) }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Attach
          </button>
        </div>
      </div>
    </div>
  );
}

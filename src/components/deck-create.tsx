"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { DECK_COLORS } from "@/lib/colors";

export function DeckCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(DECK_COLORS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subject, description, color }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    setOpen(false);
    setTitle("");
    setSubject("");
    setDescription("");
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-accent">
        <Plus className="h-4 w-4" />
        New deck
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
            onClick={() => !busy && setOpen(false)}
          />
          <form
            onSubmit={submit}
            className="paper-card relative w-full max-w-md animate-fade-up p-6 shadow-pop"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-medium">New deck</h3>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="btn-icon h-8 w-8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  Deck title
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Deck name"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  Description <span className="font-normal text-ink-3">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this deck cover?"
                  rows={2}
                  className="field resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {DECK_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                        color === c.value
                          ? "ring-2 ring-ink ring-offset-2 ring-offset-card"
                          : ""
                      }`}
                      style={{ backgroundColor: c.value }}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost"
                disabled={busy}
              >
                Cancel
              </button>
              <button type="submit" className="btn-accent" disabled={busy || !title.trim()}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Create deck
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

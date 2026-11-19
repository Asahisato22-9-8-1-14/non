"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

export function MapCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subject }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    const map = await res.json();
    setOpen(false);
    setBusy(false);
    router.push(`/maps/${map.id}`);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-accent">
        <Plus className="h-4 w-4" />
        New map
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
              <h3 className="font-display text-2xl font-medium">New mind map</h3>
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
                  Central idea
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Central idea"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  Subject <span className="font-normal text-ink-3">(optional)</span>
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="field"
                />
              </div>
              <p className="rounded-xl bg-paper-2 px-3.5 py-2.5 text-xs text-ink-2">
                A root node is created automatically — start branching with the
                <span className="font-semibold text-ink"> + </span> button once
                you&apos;re in.
              </p>
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
                Create map
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Link2,
  Loader2,
  Map as MapIcon,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import type { CardRow, LinkRow, MapSummary } from "@/lib/types";
import { BOX_META, dueLabel } from "@/lib/format";
import { DeleteButton } from "@/components/delete-button";
import { LinkPickerDialog } from "@/components/link-picker";

export function DeckEditor({
  deckId,
  cards,
  links,
  maps,
}: {
  deckId: number;
  cards: CardRow[];
  links: LinkRow[];
  maps: MapSummary[];
}) {
  const router = useRouter();
  const [allLinks, setAllLinks] = useState<LinkRow[]>(links);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const [pickerCard, setPickerCard] = useState<CardRow | null>(null);

  // Keep local link state in sync with fresh server data (e.g. after a
  // card is deleted and its links cascade away).
  useEffect(() => {
    setAllLinks(links);
  }, [links]);

  const linksByCard = useMemo(() => {
    const m = new Map<number, LinkRow[]>();
    for (const l of allLinks) {
      if (l.cardId == null) continue;
      const list = m.get(l.cardId) ?? [];
      list.push(l);
      m.set(l.cardId, list);
    }
    return m;
  }, [allLinks]);

  const linkedTotal = allLinks.filter((l) => l.cardId != null).length;

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim() || busy) return;
    setBusy(true);
    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId, front, back }),
    });
    setFront("");
    setBack("");
    setBusy(false);
    router.refresh();
  }

  function startEdit(card: CardRow) {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  }

  async function saveEdit(id: number) {
    if (!editFront.trim() || !editBack.trim()) return;
    await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: editFront, back: editBack }),
    });
    setEditingId(null);
    router.refresh();
  }

  async function unlink(link: LinkRow) {
    setAllLinks((ls) => ls.filter((l) => l.id !== link.id));
    await fetch(`/api/links/${link.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mt-8">
      {/* -------- add card -------- */}
      <form onSubmit={addCard} className="paper-card p-5 sm:p-6">
        <p className="eyebrow">Add a card</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front — the question"
            rows={2}
            className="field resize-none font-medium"
          />
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back — the answer"
            rows={2}
            className="field resize-none"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-ink-3">
            One sharp question per card works best.
          </p>
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !front.trim() || !back.trim()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add card
          </button>
        </div>
      </form>

      {/* -------- card list -------- */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">All cards · {cards.length}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <Link2 className="h-3.5 w-3.5" />
            {linkedTotal} card{linkedTotal === 1 ? "" : "s"} linked to mind maps
          </p>
        </div>

        {cards.length === 0 ? (
          <p className="mt-4 text-sm text-ink-3">
            No cards yet — add your first one above.
          </p>
        ) : (
          <div className="paper-card mt-3 divide-y divide-line overflow-hidden">
            {cards.map((card) => {
              const meta = BOX_META[card.box] ?? BOX_META[1];
              const due = new Date(card.nextReviewAt).getTime() <= Date.now();
              const cardLinks = linksByCard.get(card.id) ?? [];
              if (editingId === card.id) {
                return (
                  <div key={card.id} className="bg-paper-2/50 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <textarea
                        value={editFront}
                        onChange={(e) => setEditFront(e.target.value)}
                        rows={2}
                        className="field resize-none font-medium"
                      />
                      <textarea
                        value={editBack}
                        onChange={(e) => setEditBack(e.target.value)}
                        rows={2}
                        className="field resize-none"
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-ghost px-3.5 py-1.5 text-xs"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(card.id)}
                        disabled={!editFront.trim() || !editBack.trim()}
                        className="btn-accent px-3.5 py-1.5 text-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={card.id}
                  className="group flex items-start gap-4 p-4 transition-colors hover:bg-paper-2/40 sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{card.front}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-2">{card.back}</p>

                    {/* ---- mind map connections ---- */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {cardLinks.map((l) => (
                        <span
                          key={l.id}
                          className="chip border border-line bg-paper-2/70 text-ink-2"
                          title={`See “${l.nodeLabel}” in ${l.mapTitle}`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: l.nodeColor }}
                          />
                          <Link
                            href={`/maps/${l.mapId}?node=${l.nodeId}`}
                            className="max-w-[190px] truncate hover:text-accent hover:underline"
                          >
                            {l.nodeLabel}
                          </Link>
                          <button
                            onClick={() => unlink(l)}
                            className="ml-0.5 cursor-pointer text-ink-3 hover:text-rose-600"
                            title="Remove this link"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}

                      {cardLinks.length > 0 && (
                        <Link
                          href={`/maps/${cardLinks[0].mapId}?node=${cardLinks[0].nodeId}`}
                          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                        >
                          <MapIcon className="h-3.5 w-3.5" />
                          See in mind map
                        </Link>
                      )}

                      <button
                        onClick={() => setPickerCard(card)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line px-2.5 py-1 text-xs font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
                      >
                        <Plus className="h-3 w-3" />
                        {cardLinks.length === 0 ? "Add to mind map" : "Link another"}
                      </button>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                    <span className={`chip ${meta.className}`}>{meta.label}</span>
                    <span
                      className={`chip ${
                        due ? "tag-rose" : "border border-line bg-card text-ink-3"
                      }`}
                    >
                      {dueLabel(card.nextReviewAt)}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={() => startEdit(card)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-card text-ink-2 hover:text-ink"
                        title="Edit card"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <DeleteButton url={`/api/cards/${card.id}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-card text-ink-2 shadow-none hover:border-rose-300 hover:!text-rose-600" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* -------- link picker -------- */}
      {pickerCard && (
        <LinkPickerDialog
          open
          mode="card"
          cardId={pickerCard.id}
          defaultLabel={pickerCard.front}
          defaultSubject="General"
          maps={maps}
          onClose={() => setPickerCard(null)}
          onLinked={(link) => {
            setAllLinks((ls) =>
              ls.some((l) => l.id === link.id) ? ls : [...ls, link],
            );
            setPickerCard(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Eye,
  Layers3,
  Link2,
  Loader2,
  NotebookPen,
  Plus,
  StickyNote,
  Trash2,
  Unlink,
  X,
  Zap,
} from "lucide-react";
import type {
  DeckPicker,
  LinkedNote,
  MapNodeRow,
  MapSummary,
  NodeLinks,
  NoteRow,
} from "@/lib/types";
import { NODE_COLORS } from "@/lib/colors";
import { BOX_META } from "@/lib/format";
import { EntityPickerDialog } from "@/components/entity-picker";
import { ConceptStudy } from "@/components/concept-study";

type Props = {
  node: MapNodeRow;
  isRoot: boolean;
  childCount: number;
  mapSubject: string;
  maps: MapSummary[];
  decks: DeckPicker[];
  notes: NoteRow[];
  onClose: () => void;
  onAddChild: () => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  onRename: (label: string) => void;
  onLinkCountChange: (nodeId: number, count: number) => void;
};

export function ConceptPanel({
  node,
  isRoot,
  childCount,
  mapSubject,
  maps,
  decks,
  notes,
  onClose,
  onAddChild,
  onColorChange,
  onDelete,
  onRename,
  onLinkCountChange,
}: Props) {
  const router = useRouter();
  const [links, setLinks] = useState<NodeLinks>({ cards: [], notes: [] });
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<"card" | "note" | null>(null);
  const [openCard, setOpenCard] = useState<number | null>(null);
  const [notePreview, setNotePreview] = useState<LinkedNote | null>(null);
  const [studyOpen, setStudyOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState(node.label);
  const [busyNote, setBusyNote] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState<number | null>(null);

  useEffect(() => {
    setDraftLabel(node.label);
  }, [node.id, node.label]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/links?nodeId=${node.id}`);
      if (res.ok) {
        const data: NodeLinks = await res.json();
        setLinks(data);
        onLinkCountChange(node.id, data.cards.length + data.notes.length);
      }
    } finally {
      setLoading(false);
    }
  }, [node.id, onLinkCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (confirmUnlink == null) return;
    const t = setTimeout(() => setConfirmUnlink(null), 2500);
    return () => clearTimeout(t);
  }, [confirmUnlink]);

  async function unlink(link: { id: number }) {
    setLinks((l) => ({
      cards: l.cards.filter((c) => c.linkId !== link.id),
      notes: l.notes.filter((n) => n.linkId !== link.id),
    }));
    await fetch(`/api/links/${link.id}`, { method: "DELETE" });
    await load();
  }

  async function createLinkedNote() {
    if (busyNote) return;
    setBusyNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: node.label,
          subject: mapSubject,
          content: `${node.label}\n\nWrite your notes for this concept here…`,
        }),
      });
      const note = await res.json();
      await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: node.id, noteId: note.id }),
      });
      await load();
      router.refresh();
    } finally {
      setBusyNote(false);
    }
  }

  function commitRename() {
    const next = draftLabel.trim();
    if (next && next !== node.label) onRename(next);
    else setDraftLabel(node.label);
  }

  const cardCount = links.cards.length;
  const noteCount = links.notes.length;

  return (
    <>
      <aside className="flex max-h-[60vh] w-full shrink-0 flex-col overflow-hidden border-t border-line bg-card md:max-h-none md:w-[344px] md:border-t-0 md:border-l">
        {/* header */}
        <div className="shrink-0 border-b border-line px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <span
              className="chip"
              style={{ backgroundColor: `${node.color}1f`, color: node.color }}
            >
              {isRoot ? "Central concept" : "Concept"}
            </span>
            <button onClick={onClose} className="btn-icon h-7 w-7" title="Close panel">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="mt-2 w-full rounded-lg bg-transparent font-display text-xl leading-snug font-medium focus:bg-paper-2 focus:px-2 focus:py-1 focus:outline-none"
            placeholder="Concept label"
          />

          <div className="mt-1 flex items-center gap-3 text-xs text-ink-3">
            <span>
              {childCount} {childCount === 1 ? "branch" : "branches"}
            </span>
            <span>·</span>
            <span>
              {cardCount + noteCount} linked{" "}
              {cardCount + noteCount === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {NODE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className={`h-6 w-6 cursor-pointer rounded-full transition-transform hover:scale-110 ${
                  node.color === c ? "ring-2 ring-ink ring-offset-1 ring-offset-card" : ""
                }`}
                style={{ backgroundColor: c }}
                title="Set node color"
              />
            ))}
            <span className="flex-1" />
            <button onClick={onAddChild} className="btn-ghost h-8 px-3 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Branch
            </button>
            {!isRoot && (
              <button
                onClick={onDelete}
                className="btn-ghost h-8 px-3 text-xs hover:border-rose-300 hover:!text-rose-600"
                title="Delete node"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading linked items…
            </div>
          ) : (
            <div className="space-y-5">
              {/* ---------- flashcards ---------- */}
              <section>
                <div className="flex items-center justify-between">
                  <p className="eyebrow flex items-center gap-1.5">
                    <Layers3 className="h-3.5 w-3.5" />
                    Flashcards {cardCount > 0 && `· ${cardCount}`}
                  </p>
                  <button
                    onClick={() => setPicker("card")}
                    className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-accent"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Attach
                  </button>
                </div>

                {cardCount === 0 ? (
                  <p className="mt-2 rounded-xl bg-paper-2/60 px-3 py-2.5 text-xs text-ink-2">
                    No flashcards here yet. Attach one to quiz yourself on this
                    exact concept.
                  </p>
                ) : (
                  <>
                    <button
                      onClick={() => setStudyOpen(true)}
                      className="btn-accent mt-2.5 w-full py-2 text-xs"
                    >
                      <Zap className="h-3.5 w-3.5 text-gold" />
                      Drill these {cardCount} card{cardCount === 1 ? "" : "s"}
                    </button>
                    <div className="mt-2.5 space-y-2">
                      {links.cards.map((card) => {
                        const meta = BOX_META[card.box] ?? BOX_META[1];
                        const expanded = openCard === card.id;
                        return (
                          <div
                            key={card.id}
                            className="rounded-xl border border-line bg-paper-2/40 p-3"
                          >
                            <button
                              onClick={() =>
                                setOpenCard(expanded ? null : card.id)
                              }
                              className="w-full cursor-pointer text-left"
                            >
                              <p className="text-sm font-medium">{card.front}</p>
                              {expanded && (
                                <p className="mt-2 border-t border-dashed border-line pt-2 text-sm text-accent">
                                  {card.back}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className={`chip ${meta.className}`}>
                                  {meta.label}
                                </span>
                                <span className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                                  {expanded ? "hide answer" : "tap to flip"}
                                </span>
                              </div>
                            </button>
                            <UnlinkRow
                              linkId={card.linkId}
                              confirming={confirmUnlink === card.linkId}
                              onConfirm={() => setConfirmUnlink(card.linkId)}
                              onUnlink={() => unlink({ id: card.linkId })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              {/* ---------- notes ---------- */}
              <section>
                <div className="flex items-center justify-between">
                  <p className="eyebrow flex items-center gap-1.5">
                    <NotebookPen className="h-3.5 w-3.5" />
                    Notes {noteCount > 0 && `· ${noteCount}`}
                  </p>
                  <button
                    onClick={() => setPicker("note")}
                    className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-accent"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Attach
                  </button>
                </div>

                {noteCount === 0 ? (
                  <div className="mt-2 rounded-xl bg-paper-2/60 px-3 py-2.5">
                    <p className="text-xs text-ink-2">
                      No notes linked to this concept.
                    </p>
                    <button
                      onClick={createLinkedNote}
                      disabled={busyNote}
                      className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-accent disabled:opacity-50"
                    >
                      {busyNote ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <StickyNote className="h-3.5 w-3.5" />
                      )}
                      Create a note for this concept
                    </button>
                  </div>
                ) : (
                  <div className="mt-2.5 space-y-2">
                    {links.notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-line bg-paper-2/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => setNotePreview(note)}
                            className="min-w-0 flex-1 cursor-pointer text-left"
                          >
                            <p className="truncate text-sm font-semibold">
                              {note.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-ink-2">
                              {note.content.slice(0, 90) || "Empty note"}
                            </p>
                          </button>
                          <button
                            onClick={() => setNotePreview(note)}
                            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-card text-ink-2 hover:text-ink"
                            title="Preview note"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <UnlinkRow
                          linkId={note.linkId}
                          confirming={confirmUnlink === note.linkId}
                          onConfirm={() => setConfirmUnlink(note.linkId)}
                          onUnlink={() => unlink({ id: note.linkId })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </aside>

      {/* ---------- attach picker ---------- */}
      {picker && (
        <EntityPickerDialog
          open
          nodeId={node.id}
          nodeLabel={node.label}
          decks={decks}
          notes={notes}
          onClose={() => setPicker(null)}
          onLinked={() => {
            setPicker(null);
            void load();
            router.refresh();
          }}
        />
      )}

      {/* ---------- note preview ---------- */}
      {notePreview && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm"
            onClick={() => setNotePreview(null)}
          />
          <div className="paper-card relative flex max-h-[85vh] w-full max-w-2xl animate-fade-up flex-col shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="min-w-0">
                <span className="chip border border-line bg-card text-ink-2">
                  {notePreview.subject}
                </span>
                <h3 className="mt-2 truncate font-display text-2xl font-medium">
                  {notePreview.title}
                </h3>
              </div>
              <button
                onClick={() => setNotePreview(null)}
                className="btn-icon h-8 w-8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                {notePreview.content || "This note is empty."}
              </pre>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-line px-5 py-3.5">
              <button onClick={() => setNotePreview(null)} className="btn-ghost">
                Close
              </button>
              <button
                onClick={() => router.push(`/notes?note=${notePreview.id}`)}
                className="btn-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- concept drill ---------- */}
      {studyOpen && cardCount > 0 && (
        <ConceptStudy
          title={node.label}
          cards={links.cards}
          onClose={() => {
            setStudyOpen(false);
            void load();
          }}
        />
      )}
    </>
  );
}

function UnlinkRow({
  linkId,
  confirming,
  onConfirm,
  onUnlink,
}: {
  linkId: number;
  confirming: boolean;
  onConfirm: () => void;
  onUnlink: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-end">
      <button
        onClick={() => (confirming ? onUnlink() : onConfirm())}
        className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-ink-3 hover:text-rose-600"
        title="Remove this link"
      >
        {confirming ? (
          <span className="text-rose-600">remove link?</span>
        ) : (
          <>
            <Unlink className="h-3 w-3" />
            unlink
          </>
        )}
      </button>
    </div>
  );
}

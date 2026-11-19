"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import type { CardRow, Deck, LinkRow } from "@/lib/types";
import { BOX_META, dueLabel } from "@/lib/format";
import { Map as MapIcon } from "lucide-react";
import { RATING_ORDER, RATING_STYLES } from "@/lib/rating-ui";
import type { Rating } from "@/lib/srs";

export function StudySession({
  deck,
  cards,
  links,
  mode,
}: {
  deck: Deck;
  cards: CardRow[];
  links: LinkRow[];
  mode: "due" | "all";
}) {
  const router = useRouter();
  const linksByCard = useMemo(() => {
    const m = new Map<number, LinkRow[]>();
    for (const l of links) {
      if (l.cardId == null) continue;
      const list = m.get(l.cardId) ?? [];
      list.push(l);
      m.set(l.cardId, list);
    }
    return m;
  }, [links]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [tally, setTally] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const card = cards[index];

  const rate = useCallback(
    (rating: Rating) => {
      if (!card || !flipped) return;
      setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
      // Persist in the background; the UI never waits on it.
      fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, rating }),
      }).catch(() => {});
      if (index + 1 >= cards.length) {
        setDone(true);
      } else {
        setFlipped(false);
        setIndex((i) => i + 1);
      }
    },
    [card, flipped, index, cards.length],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || !card) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (!flipped) return;
      if (e.key === "1") rate("again");
      else if (e.key === "2") rate("hard");
      else if (e.key === "3") rate("good");
      else if (e.key === "4") rate("easy");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, done, card, rate]);

  function restart() {
    router.refresh();
    setIndex(0);
    setFlipped(false);
    setDone(false);
    setTally({ again: 0, hard: 0, good: 0, easy: 0 });
  }

  /* ---------------- caught up ---------------- */
  if (cards.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint/15 text-mint">
          <GraduationCap className="h-8 w-8" />
        </span>
        <h1 className="mt-5 font-display text-4xl font-medium">
          All caught up!
        </h1>
        <p className="mt-3 max-w-md text-ink-2">
          Nothing is due in <strong>{deck.title}</strong> right now. Spaced
          repetition works best with rest — come back when the next reviews
          unlock.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={`/study/${deck.id}?mode=all`} className="btn-accent">
            <Zap className="h-4 w-4 text-gold" />
            Study all {mode === "all" ? "" : "cards"} anyway
          </Link>
          <Link href={`/decks/${deck.id}`} className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- session complete ---------------- */
  if (done) {
    const reviewed = Object.values(tally).reduce((a, b) => a + b, 0);
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-5 font-display text-4xl font-medium">Session complete</h1>
        <p className="mt-2 text-ink-2">
          You reviewed <strong>{reviewed}</strong> card{reviewed === 1 ? "" : "s"}
          {mode === "all" ? " from the whole deck" : ""}. The schedule has been
          updated.
        </p>
        <div className="mt-8 grid w-full max-w-md grid-cols-4 gap-2.5">
          {RATING_ORDER.map((r) => (
            <div key={r} className="paper-card px-2 py-3 text-center">
              <p
                className={`font-display text-2xl font-semibold tabular-nums ${RATING_STYLES[r].textClass}`}
              >
                {tally[r]}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                {RATING_STYLES[r].label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={restart} className="btn-accent">
            <RotateCcw className="h-4 w-4" />
            Study again
          </button>
          <Link href={`/decks/${deck.id}`} className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- active session ---------------- */
  const progress = (index / cards.length) * 100;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col px-4 pb-8 sm:px-6">
      {/* top bar */}
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 pt-5">
        <Link
          href={`/decks/${deck.id}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink-2 transition hover:text-ink"
          title="Exit session"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{deck.title}</p>
          <p className="text-xs text-ink-3">
            {mode === "all" ? "Full deck" : "Due today"} · card {index + 1} of{" "}
            {cards.length}
          </p>
        </div>
        <span
          className="chip shrink-0"
          style={{ backgroundColor: `${deck.color}1f`, color: deck.color }}
        >
          {deck.subject}
        </span>
      </div>

      {/* progress */}
      <div className="mx-auto mt-4 h-1.5 w-full max-w-2xl overflow-hidden rounded-full bg-paper-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* card */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center py-6">
        <div className="flip-scene w-full">
          <div
            className={`flip-inner relative h-[300px] w-full cursor-pointer sm:h-[340px] ${flipped ? "is-flipped" : ""}`}
            onClick={() => setFlipped((f) => !f)}
          >
            {/* front */}
            <div className="flip-face paper-card absolute inset-0 flex flex-col p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Question</p>
                {card && (
                  <span
                    className={`chip ${(BOX_META[card.box] ?? BOX_META[1]).className}`}
                  >
                    Box {card.box} · {(BOX_META[card.box] ?? BOX_META[1]).label}
                  </span>
                )}
              </div>
              <div className="flex flex-1 items-center justify-center px-2 text-center">
                <p className="font-display text-2xl leading-snug sm:text-[1.7rem]">
                  {card?.front}
                </p>
              </div>
              <ConceptChips links={card ? (linksByCard.get(card.id) ?? []) : []} />
              <p className="text-center text-xs text-ink-3">
                Click the card or press{" "}
                <span className="kbd">Space</span> to flip
              </p>
            </div>

            {/* back */}
            <div className="flip-face flip-face-back paper-card absolute inset-0 flex flex-col border-accent/40 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Answer</p>
                {card && (
                  <span className="text-xs text-ink-3">
                    was due {dueLabel(card.nextReviewAt)}
                  </span>
                )}
              </div>
              <div className="flex flex-1 items-center justify-center px-2 text-center">
                <p className="font-display text-2xl leading-snug text-accent sm:text-[1.7rem]">
                  {card?.back}
                </p>
              </div>
              <ConceptChips links={card ? (linksByCard.get(card.id) ?? []) : []} />
              <p className="text-center text-xs text-ink-3">
                How well did you know it?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ratings */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {RATING_ORDER.map((r) => {
            const s = RATING_STYLES[r];
            return (
              <button
                key={r}
                onClick={() => rate(r)}
                disabled={!flipped}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 py-3 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${s.className}`}
              >
                <span className="flex items-center gap-1.5">
                  {s.label}
                  <span className="kbd border-white/30 bg-white/15 !text-white">
                    {s.kbd}
                  </span>
                </span>
                <span className="text-[10px] font-medium opacity-80">
                  {s.hint}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-ink-3">
          Again returns the card in 10 minutes · Easy pushes it 2 boxes forward
        </p>
      </div>
    </div>
  );
}

function ConceptChips({ links }: { links: LinkRow[] }) {
  if (links.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap justify-center gap-1.5">
      {links.map((l) => (
        <Link
          key={l.id}
          href={`/maps/${l.mapId}?node=${l.nodeId}`}
          onClick={(e) => e.stopPropagation()}
          className="chip border border-line bg-paper-2/70 text-ink-2 transition-colors hover:border-accent hover:text-accent"
          title={`Open “${l.nodeLabel}” in ${l.mapTitle}`}
        >
          <MapIcon className="h-3 w-3" />
          <span className="max-w-[160px] truncate">{l.nodeLabel}</span>
        </Link>
      ))}
    </div>
  );
}

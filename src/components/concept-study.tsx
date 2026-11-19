"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import type { CardRow } from "@/lib/types";
import { RATING_ORDER, RATING_STYLES } from "@/lib/rating-ui";
import type { Rating } from "@/lib/srs";

/** A compact flashcard drill for the cards attached to one concept. */
export function ConceptStudy({
  title,
  cards,
  onClose,
}: {
  title: string;
  cards: CardRow[];
  onClose: () => void;
}) {
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
      fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, rating }),
      }).catch(() => {});
      if (index + 1 >= cards.length) setDone(true);
      else {
        setFlipped(false);
        setIndex((i) => i + 1);
      }
    },
    [card, flipped, index, cards.length],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (done || !card) return;
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
  }, [flipped, done, card, rate, onClose]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={onClose} />

      <div className="paper-card relative w-full max-w-xl animate-fade-up p-5 shadow-pop sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Concept drill</p>
            <p className="truncate font-display text-xl font-medium">{title}</p>
          </div>
          <button onClick={onClose} className="btn-icon h-8 w-8">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-mint" />
            <p className="mt-3 font-display text-2xl font-medium">
              Concept reviewed
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {cards.length} card{cards.length === 1 ? "" : "s"} from “{title}”
              scheduled.
            </p>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {RATING_ORDER.map((r) => (
                <div key={r} className="rounded-xl border border-line py-2.5">
                  <p
                    className={`font-display text-xl font-semibold tabular-nums ${RATING_STYLES[r].textClass}`}
                  >
                    {tally[r]}
                  </p>
                  <p className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                    {RATING_STYLES[r].label}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="btn-accent mt-6">
              <ArrowLeft className="h-4 w-4" />
              Back to map
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-3">
              <span>
                Card {index + 1} of {cards.length}
              </span>
              <span>press space to flip</span>
            </div>

            <div
              className={`mt-2 flex min-h-[190px] cursor-pointer flex-col justify-center rounded-2xl border-2 border-dashed border-line bg-paper-2/50 p-6 text-center transition-colors hover:border-accent/40 ${
                flipped ? "border-solid border-accent/40 bg-accent/5" : ""
              }`}
              onClick={() => setFlipped((f) => !f)}
            >
              <p className="eyebrow mb-2">{flipped ? "Answer" : "Question"}</p>
              <p
                className={`font-display text-xl leading-snug sm:text-2xl ${
                  flipped ? "text-accent" : ""
                }`}
              >
                {flipped ? card?.back : card?.front}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {RATING_ORDER.map((r) => (
                <button
                  key={r}
                  onClick={() => rate(r)}
                  disabled={!flipped}
                  className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${RATING_STYLES[r].className}`}
                >
                  {RATING_STYLES[r].label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

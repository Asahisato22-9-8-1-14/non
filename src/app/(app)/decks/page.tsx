import Link from "next/link";
import { Layers3, Plus } from "lucide-react";
import { getDecksWithStats } from "@/lib/queries";
import { tint } from "@/lib/colors";
import { DeckCreateDialog } from "@/components/deck-create";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const decks = await getDecksWithStats();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="animate-fade-up">
          <p className="eyebrow">Library</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Flashcard decks
          </h1>
          <p className="mt-3 max-w-xl text-ink-2">
            Each card climbs the Leitner boxes — the better you know it, the
            longer it stays away.
          </p>
        </div>
        <DeckCreateDialog />
      </div>

      {decks.length === 0 ? (
        <div className="paper-card mt-10 flex flex-col items-center gap-3 p-12 text-center">
          <Layers3 className="h-8 w-8 text-ink-3" />
          <p className="font-display text-xl">No decks yet</p>
          <p className="max-w-sm text-sm text-ink-2">
            Create your first deck and add a few cards — future you will thank
            present you.
          </p>
        </div>
      ) : (
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const pct =
              deck.total > 0
                ? Math.round((deck.mastered / deck.total) * 100)
                : 0;
            return (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className="paper-card group flex flex-col p-5 transition-colors hover:border-ink-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="chip"
                    style={{
                      backgroundColor: tint(deck.color, 0.13),
                      color: deck.color,
                    }}
                  >
                    {deck.subject}
                  </span>
                  {deck.due > 0 && (
                    <span className="chip tag-rose">
                      {deck.due} due
                    </span>
                  )}
                </div>
                <h2 className="mt-3 font-display text-[1.4rem] leading-snug font-medium group-hover:text-accent">
                  {deck.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-ink-2">
                  {deck.description || "No description yet."}
                </p>
                <div className="mt-5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: deck.color,
                      }}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-ink-3">
                    <span>
                      <strong className="text-ink">{deck.total}</strong> cards
                    </span>
                    <span>
                      <strong className="text-mint">{deck.mastered}</strong>{" "}
                      mastered
                    </span>
                    <span>{pct}%</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-10 flex items-center gap-2 text-sm text-ink-3">
        <Plus className="h-4 w-4" />
        Tip: write cards that ask one specific question each — they&apos;re
        easier to recall under pressure.
      </p>
    </div>
  );
}

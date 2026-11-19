import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Play, Zap } from "lucide-react";
import {
  getDeck,
  getDeckCards,
  getLinksForDeckCards,
  getMapsForPicker,
} from "@/lib/queries";
import { tint } from "@/lib/colors";
import { DeckEditor } from "@/components/deck-editor";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deckId = Number(id);
  if (!Number.isInteger(deckId)) notFound();

  const deck = await getDeck(deckId);
  if (!deck) notFound();

  const [cards, links, maps] = await Promise.all([
    getDeckCards(deckId),
    getLinksForDeckCards(deckId),
    getMapsForPicker(),
  ]);
  const due = cards.filter(
    (c) => new Date(c.nextReviewAt).getTime() <= Date.now(),
  ).length;
  const mastered = cards.filter((c) => c.box >= 4).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/decks"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All decks
      </Link>

      <div className="paper-card mt-4 overflow-hidden">
        <div className="h-2" style={{ backgroundColor: deck.color }} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <span
                className="chip"
                style={{
                  backgroundColor: tint(deck.color, 0.13),
                  color: deck.color,
                }}
              >
                {deck.subject}
              </span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {deck.title}
              </h1>
              {deck.description && (
                <p className="mt-3 max-w-2xl text-ink-2">{deck.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="chip border border-line bg-card text-ink-2">
                  {cards.length} cards
                </span>
                <span className="chip tag-rose">
                  {due} due now
                </span>
                <span className="chip tag-emerald">
                  {mastered} mastered
                </span>
                <span className="chip tag-violet">
                  {links.length} in mind maps
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href={`/study/${deck.id}`} className="btn-accent px-6 py-3">
                <Play className="h-4 w-4 fill-current" />
                {due > 0 ? `Study ${due} due` : "Study session"}
              </Link>
              <Link href={`/study/${deck.id}?mode=all`} className="btn-ghost">
                <Zap className="h-4 w-4 text-gold" />
                Study all
              </Link>
              <DeleteButton url={`/api/decks/${deck.id}`} redirectTo="/decks" />
            </div>
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="paper-card mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <Check className="h-8 w-8 text-mint" />
          <p className="font-display text-xl">An empty canvas for knowledge</p>
          <p className="max-w-sm text-sm text-ink-2">
            Add your first flashcard below. Keep each one a single, sharp
            question.
          </p>
        </div>
      ) : null}

      <DeckEditor
        deckId={deck.id}
        cards={cards}
        links={links}
        maps={maps}
      />
    </div>
  );
}

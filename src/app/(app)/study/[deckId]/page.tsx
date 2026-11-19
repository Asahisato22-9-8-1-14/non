import { notFound } from "next/navigation";
import {
  getAllDeckCards,
  getDeck,
  getDueCards,
  getLinksForDeckCards,
} from "@/lib/queries";
import { StudySession } from "@/components/study-session";

export const dynamic = "force-dynamic";

export default async function StudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ deckId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { deckId } = await params;
  const { mode } = await searchParams;
  const id = Number(deckId);
  if (!Number.isInteger(id)) notFound();

  const deck = await getDeck(id);
  if (!deck) notFound();

  const [cards, links] = await Promise.all([
    mode === "all" ? getAllDeckCards(id) : getDueCards(id),
    getLinksForDeckCards(id),
  ]);

  return (
    <StudySession
      deck={deck}
      cards={cards}
      links={links}
      mode={mode === "all" ? "all" : "due"}
    />
  );
}

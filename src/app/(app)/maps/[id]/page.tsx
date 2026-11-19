import { notFound } from "next/navigation";
import {
  getDecksWithCardsForPicker,
  getLinkedNodeIds,
  getMap,
  getMapsForPicker,
  getNotes,
} from "@/lib/queries";
import { MindMapEditor } from "@/components/mind-map-editor";

export const dynamic = "force-dynamic";

export default async function MapDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ node?: string }>;
}) {
  const { id } = await params;
  const { node } = await searchParams;
  const mapId = Number(id);
  if (!Number.isInteger(mapId)) notFound();

  const map = await getMap(mapId);
  if (!map) notFound();

  const [maps, decks, notes, linkedNodeIds] = await Promise.all([
    getMapsForPicker(),
    getDecksWithCardsForPicker(),
    getNotes(),
    getLinkedNodeIds(mapId),
  ]);

  const focusNodeId = Number(node);

  return (
    <MindMapEditor
      mapId={map.id}
      initialTitle={map.title}
      initialSubject={map.subject}
      initialNodes={map.nodes}
      initialMaps={maps}
      initialDecks={decks}
      initialNotes={notes}
      initialLinkedNodeIds={linkedNodeIds}
      focusNodeId={Number.isInteger(focusNodeId) ? focusNodeId : undefined}
    />
  );
}

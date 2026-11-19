import { getLinksForAllNotes, getMapsForPicker, getNotes } from "@/lib/queries";
import { NotesManager } from "@/components/notes-manager";

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const { note } = await searchParams;
  const [notes, links, maps] = await Promise.all([
    getNotes(),
    getLinksForAllNotes(),
    getMapsForPicker(),
  ]);

  const focusId = Number(note);

  return (
    <NotesManager
      initialNotes={notes}
      initialLinks={links}
      maps={maps}
      focusNoteId={Number.isInteger(focusId) ? focusId : undefined}
    />
  );
}

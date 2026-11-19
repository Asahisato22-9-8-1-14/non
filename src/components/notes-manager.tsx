"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Pin,
  PinOff,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Link2, Map as MapIcon } from "lucide-react";
import type { LinkRow, MapSummary, NoteRow } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { LinkPickerDialog } from "@/components/link-picker";

export function NotesManager({
  initialNotes,
  initialLinks,
  maps,
  focusNoteId,
}: {
  initialNotes: NoteRow[];
  initialLinks: LinkRow[];
  maps: MapSummary[];
  focusNoteId?: number;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes);
  const [allLinks, setAllLinks] = useState<LinkRow[]>(initialLinks);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(
    initialNotes.find((n) => n.id === focusNoteId)?.id ??
      initialNotes[0]?.id ??
      null,
  );
  const [title, setTitle] = useState(initialNotes[0]?.title ?? "");
  const [subject, setSubject] = useState(initialNotes[0]?.subject ?? "General");
  const [content, setContent] = useState(initialNotes[0]?.content ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = notes.find((n) => n.id === activeId) ?? null;

  // Deep link from a mind map: /notes?note=<id>
  useEffect(() => {
    if (focusNoteId != null) setActiveId(focusNoteId);
  }, [focusNoteId]);

  // Keep local link state in sync with fresh server data.
  useEffect(() => {
    setAllLinks(initialLinks);
  }, [initialLinks]);

  // Load the active note into the editor when switching notes.
  useEffect(() => {
    const n = notes.find((x) => x.id === activeId);
    if (n) {
      setTitle(n.title);
      setSubject(n.subject);
      setContent(n.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const sorted = useMemo(
    () =>
      [...notes].sort((a, b) =>
        a.pinned === b.pinned
          ? b.updatedAt.localeCompare(a.updatedAt)
          : a.pinned
            ? -1
            : 1,
      ),
    [notes],
  );

  function queueSave(
    id: number,
    patch: { title?: string; content?: string; subject?: string },
  ) {
    setSaveState("saving");
    setNotes((ns) =>
      ns.map((n) =>
        n.id === id
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n,
      ),
    );
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => {});
      setSaveState("saved");
    }, 600);
  }

  async function createNote() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled note", content: "" }),
      });
      const note: NoteRow = await res.json();
      setNotes((ns) => [note, ...ns]);
      setActiveId(note.id);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function togglePin(note: NoteRow) {
    setNotes((ns) =>
      ns.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n)),
    );
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    router.refresh();
  }

  async function removeNote(id: number) {
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null);
    }
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  /* ---------- mind map connections ---------- */
  const linksByNote = useMemo(() => {
    const m = new Map<number, LinkRow[]>();
    for (const l of allLinks) {
      if (l.noteId == null) continue;
      const list = m.get(l.noteId) ?? [];
      list.push(l);
      m.set(l.noteId, list);
    }
    return m;
  }, [allLinks]);

  const activeLinks = active ? (linksByNote.get(active.id) ?? []) : [];

  async function unlink(link: LinkRow) {
    setAllLinks((ls) => ls.filter((l) => l.id !== link.id));
    await fetch(`/api/links/${link.id}`, { method: "DELETE" });
    router.refresh();
  }

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="animate-fade-up">
          <p className="eyebrow">Capture</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Notes
          </h1>
          <p className="mt-3 max-w-xl text-ink-2">
            Lecture notes, essay ideas, plans — everything autosaves as you
            type. Pin the keepers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-ink-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-mint">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          <button onClick={createNote} className="btn-accent" disabled={creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New note
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* -------- list -------- */}
        <aside className="paper-card max-h-[68vh] overflow-y-auto p-2">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <StickyNote className="h-6 w-6 text-ink-3" />
              <p className="text-sm font-medium">No notes yet</p>
              <p className="text-xs text-ink-3">
                Create one — it&apos;s one click away.
              </p>
            </div>
          ) : (
            sorted.map((n) => {
              const isActive = n.id === activeId;
              return (
                <button
                  key={n.id}
                  onClick={() => setActiveId(n.id)}
                  className={`w-full cursor-pointer rounded-xl p-3.5 text-left transition-colors ${
                    isActive
                      ? "bg-paper-2"
                      : "hover:bg-paper-2/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {n.title || "Untitled note"}
                    </p>
                    <span className="flex shrink-0 items-center gap-1">
                      {(linksByNote.get(n.id)?.length ?? 0) > 0 && (
                        <span
                          className="flex items-center gap-0.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent"
                          title="Linked to a mind map"
                        >
                          <Link2 className="h-2.5 w-2.5" strokeWidth={2.5} />
                          {linksByNote.get(n.id)!.length}
                        </span>
                      )}
                      {n.pinned && (
                        <Pin className="h-3.5 w-3.5 fill-gold text-gold" />
                      )}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-3">
                    {n.content.slice(0, 72) || "Empty note"}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                    <span>{n.subject}</span>
                    <span>·</span>
                    <span>{timeAgo(n.updatedAt)}</span>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* -------- editor -------- */}
        <section className="paper-card flex min-h-[60vh] flex-col p-5 sm:p-6">
          {active ? (
            <>
              <div className="flex flex-col gap-3 border-b border-line pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => togglePin(active)}
                      className="btn-icon h-8 w-8"
                      title={active.pinned ? "Unpin note" : "Pin note"}
                    >
                      {active.pinned ? (
                        <PinOff className="h-4 w-4 text-gold" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeNote(active.id)}
                      className="btn-icon h-8 w-8 hover:border-rose-300 hover:!text-rose-600"
                      title="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-ink-3">
                    {words} {words === 1 ? "word" : "words"} · edited{" "}
                    {timeAgo(active.updatedAt)}
                  </span>
                </div>

                {/* ---- mind map connections ---- */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeLinks.map((l) => (
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
                        className="max-w-[180px] truncate hover:text-accent hover:underline"
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

                  {activeLinks.length > 0 && (
                    <Link
                      href={`/maps/${activeLinks[0].mapId}?node=${activeLinks[0].nodeId}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                    >
                      <MapIcon className="h-3.5 w-3.5" />
                      See in mind map
                    </Link>
                  )}

                  <button
                    onClick={() => setPickerOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line px-2.5 py-1 text-xs font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
                  >
                    <Plus className="h-3 w-3" />
                    {activeLinks.length === 0 ? "Add to mind map" : "Link another"}
                  </button>
                </div>
              </div>

              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  queueSave(active.id, { title: e.target.value });
                }}
                placeholder="Note title"
                className="mt-5 w-full bg-transparent font-display text-3xl font-medium tracking-tight placeholder:text-ink-3/50 focus:outline-none"
              />
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    queueSave(active.id, { subject: e.target.value });
                  }}
                  placeholder="Subject"
                  className="field h-8 w-44 !rounded-full px-3 text-xs font-semibold"
                />
              </div>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  queueSave(active.id, { content: e.target.value });
                }}
                placeholder="Start typing… everything autosaves as you go."
                className="mt-5 w-full flex-1 resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-ink-3/50 focus:outline-none"
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <StickyNote className="h-8 w-8 text-ink-3" />
              <p className="font-display text-xl">No note selected</p>
              <p className="max-w-xs text-sm text-ink-2">
                Pick a note on the left, or start a fresh one.
              </p>
              <button onClick={createNote} className="btn-accent mt-1">
                <Plus className="h-4 w-4" />
                New note
              </button>
            </div>
          )}
        </section>
      </div>

      {pickerOpen && active && (
        <LinkPickerDialog
          open
          mode="note"
          noteId={active.id}
          defaultLabel={active.title}
          defaultSubject={active.subject}
          maps={maps}
          onClose={() => setPickerOpen(false)}
          onLinked={(link) => {
            setAllLinks((ls) =>
              ls.some((l) => l.id === link.id) ? ls : [...ls, link],
            );
            setPickerOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  GitBranchPlus,
  Link2,
  Loader2,
  Map as MapIcon,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { LinkRow, MapSummary } from "@/lib/types";
import { NODE_COLORS } from "@/lib/colors";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "card" | "note";
  cardId?: number;
  noteId?: number;
  /** Suggested label for a newly created node. */
  defaultLabel: string;
  defaultSubject?: string;
  maps: MapSummary[];
  onLinked: (link: LinkRow) => void;
};

function depthOf(
  node: { id: number; parentId: number | null },
  nodes: { id: number; parentId: number | null }[],
): number {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let depth = 0;
  let cur: { id: number; parentId: number | null } | undefined = node;
  const seen = new Set<number>();
  while (cur?.parentId != null && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = byId.get(cur.parentId);
    depth += 1;
  }
  return depth;
}

export function LinkPickerDialog({
  open,
  onClose,
  mode,
  cardId,
  noteId,
  defaultLabel,
  defaultSubject,
  maps,
  onLinked,
}: Props) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [mapId, setMapId] = useState<number | null>(maps[0]?.id ?? null);
  const [nodeId, setNodeId] = useState<number | null>(maps[0]?.nodes[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState(defaultLabel);
  const [newRootLabel, setNewRootLabel] = useState(defaultLabel);
  const [newSubject, setNewSubject] = useState(defaultSubject ?? "General");
  const [newColor, setNewColor] = useState<string>(NODE_COLORS[0]);

  const activeMap = useMemo(
    () => maps.find((m) => m.id === mapId) ?? null,
    [maps, mapId],
  );

  const filteredNodes = useMemo(() => {
    if (!activeMap) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? activeMap.nodes.filter((n) => n.label.toLowerCase().includes(q))
      : activeMap.nodes;
    return list;
  }, [activeMap, query]);

  // Reset transient state whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setTab("existing");
    setMapId(maps[0]?.id ?? null);
    setNodeId(maps[0]?.nodes[0]?.id ?? null);
    setQuery("");
    setNewTitle(defaultLabel);
    setNewRootLabel(defaultLabel);
    setNewSubject(defaultSubject ?? "General");
    setNewColor(NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)]);
    setError(null);
    setMessage(null);
  }, [open, maps, defaultLabel, defaultSubject]);

  if (!open) return null;

  const entityId = (mode === "card" ? cardId : noteId) ?? null;
  if (entityId == null) return null;

  const payload = mode === "card" ? { cardId: entityId } : { noteId: entityId };

  async function linkExistingNode() {
    if (nodeId == null || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create the link");
      return;
    }
    if (data.duplicate) {
      setMessage("Already linked to that node.");
      return;
    }
    onLinked(data as LinkRow);
    onClose();
  }

  async function addAsNewBranch() {
    if (nodeId == null || !activeMap || busy) return;
    setBusy(true);
    setError(null);
    const parent = activeMap.nodes.find((n) => n.id === nodeId);
    const res = await fetch(`/api/maps/${activeMap.id}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId: nodeId,
        label: defaultLabel,
        color: parent?.color ?? newColor,
        ...payload,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add the branch");
      return;
    }
    onLinked({
      id: data.linkId,
      nodeId: data.id,
      nodeLabel: data.label,
      nodeColor: data.color,
      mapId: activeMap.id,
      mapTitle: activeMap.title,
      cardId: mode === "card" ? entityId : null,
      noteId: mode === "note" ? entityId : null,
    });
    onClose();
  }

  async function createMapAndLink() {
    if (!newTitle.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        subject: newSubject,
        rootLabel: newRootLabel || defaultLabel,
        ...payload,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create the mind map");
      return;
    }
    onLinked({
      id: data.linkId,
      nodeId: data.root.id,
      nodeLabel: data.root.label,
      nodeColor: data.root.color,
      mapId: data.id,
      mapTitle: data.title,
      cardId: mode === "card" ? entityId : null,
      noteId: mode === "note" ? entityId : null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
      />
      <div className="paper-card relative flex max-h-[92vh] w-full max-w-lg animate-fade-up flex-col overflow-hidden rounded-b-none shadow-pop sm:rounded-b-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Link2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-xl leading-tight font-medium">
                {mode === "card" ? "Link flashcard" : "Link note"} to a mind map
              </h3>
              <p className="truncate text-xs text-ink-3">
                “{defaultLabel.slice(0, 48)}
                {defaultLabel.length > 48 ? "…" : ""}”
              </p>
            </div>
          </div>
          <button onClick={() => !busy && onClose()} className="btn-icon h-8 w-8">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-line bg-paper-2/50 px-4 pt-3">
          {(
            [
              { id: "existing", label: "Link to a map", icon: Link2 },
              { id: "new", label: "Create new map", icon: Plus },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setError(null);
                setMessage(null);
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "bg-card text-accent"
                  : "text-ink-3 hover:text-ink"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {maps.length === 0 && tab === "existing" ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MapIcon className="h-7 w-7 text-ink-3" />
              <p className="text-sm font-semibold">No mind maps yet</p>
              <p className="max-w-xs text-xs text-ink-2">
                Create your first map with the other tab — the concept becomes
                the central idea.
              </p>
            </div>
          ) : tab === "existing" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  Mind map
                </label>
                <select
                  value={mapId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setMapId(id);
                    const m = maps.find((x) => x.id === id);
                    setNodeId(m?.nodes[0]?.id ?? null);
                  }}
                  className="field cursor-pointer"
                >
                  {maps.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} · {m.subject} ({m.nodes.length} nodes)
                    </option>
                  ))}
                </select>
              </div>

              {activeMap && activeMap.nodes.length > 6 && (
                <div className="relative">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-ink-3" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search concepts…"
                    className="field pl-9"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  Pick the concept
                </label>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line bg-paper-2/40 p-2">
                  {filteredNodes.length === 0 ? (
                    <p className="p-3 text-center text-xs text-ink-3">
                      No concepts match “{query}”.
                    </p>
                  ) : (
                    filteredNodes.map((n) => {
                      const depth = depthOf(n, activeMap!.nodes);
                      const active = nodeId === n.id;
                      return (
                        <button
                          key={n.id}
                          onClick={() => setNodeId(n.id)}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                            active
                              ? "bg-card font-semibold shadow-card"
                              : "hover:bg-card/70"
                          }`}
                          style={{ paddingLeft: 10 + depth * 16 }}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: n.color }}
                          />
                          <span className="flex-1 truncate">{n.label}</span>
                          {active && (
                            <Check className="h-4 w-4 shrink-0 text-accent" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  New mind map title
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Central idea"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                  Central concept label
                </label>
                <input
                  value={newRootLabel}
                  onChange={(e) => setNewRootLabel(e.target.value)}
                  placeholder={defaultLabel}
                  className="field"
                />
                <p className="mt-1.5 text-xs text-ink-3">
                  Usually the same as the title — the card or note gets linked
                  to this node automatically.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                    Subject
                  </label>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-2">
                    Node color
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {NODE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`h-7 w-7 cursor-pointer rounded-full transition-transform hover:scale-110 ${
                          newColor === c ? "ring-2 ring-ink ring-offset-1 ring-offset-card" : ""
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {(error || message) && (
          <p
            className={`px-5 pb-1 text-sm ${error ? "text-rose-600" : "text-mint"}`}
          >
            {error ?? message}
          </p>
        )}

        {/* footer */}
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-line px-5 py-4">
          <button onClick={onClose} className="btn-ghost" disabled={busy}>
            Cancel
          </button>
          {tab === "existing" ? (
            <>
              <button
                onClick={addAsNewBranch}
                className="btn-ghost"
                disabled={busy || nodeId == null}
                title="Create a new branch node under the selected concept and link this item to it"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitBranchPlus className="h-4 w-4" />
                )}
                Add as new branch
              </button>
              <button
                onClick={linkExistingNode}
                className="btn-accent"
                disabled={busy || nodeId == null}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                <Link2 className="h-4 w-4" />
                Link to node
              </button>
            </>
          ) : (
            <button
              onClick={createMapAndLink}
              className="btn-accent"
              disabled={busy || !newTitle.trim()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapIcon className="h-4 w-4" />
              )}
              Create &amp; link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

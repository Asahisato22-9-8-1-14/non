"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  MousePointerClick,
  Palette,
  Plus,
  Trash2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { DeckPicker, MapNodeRow, MapSummary, NoteRow } from "@/lib/types";
import { NODE_COLORS } from "@/lib/colors";
import { Link2 } from "lucide-react";
import { ConceptPanel } from "@/components/concept-panel";

const NODE_W = 208;
const H_GAP = 96;
const V_GAP = 170;

type DragState =
  | {
      type: "node";
      id: number;
      startX: number;
      startY: number;
      ox: number;
      oy: number;
      dx: number;
      dy: number;
      moved: boolean;
    }
  | { type: "pan"; startX: number; startY: number; ox: number; oy: number };

function layoutTree(
  nodes: MapNodeRow[],
  rootId: number,
): Map<number, { x: number; y: number }> {
  const childrenOf = new Map<number, number[]>();
  for (const n of nodes) {
    if (n.parentId == null) continue;
    const list = childrenOf.get(n.parentId) ?? [];
    list.push(n.id);
    childrenOf.set(n.parentId, list);
  }
  const out = new Map<number, { x: number; y: number }>();
  let cursor = 0;

  function walk(id: number, depth: number): void {
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      out.set(id, { x: cursor + NODE_W / 2, y: depth * V_GAP });
      cursor += NODE_W + H_GAP;
      return;
    }
    for (const k of kids) walk(k, depth + 1);
    const first = out.get(kids[0]);
    const last = out.get(kids[kids.length - 1]);
    if (first && last) {
      out.set(id, { x: (first.x + last.x) / 2, y: depth * V_GAP });
    }
  }
  walk(rootId, 0);
  return out;
}

export function MindMapEditor({
  mapId,
  initialTitle,
  initialSubject,
  initialNodes,
  initialMaps,
  initialDecks,
  initialNotes,
  focusNodeId,
  initialLinkedNodeIds,
}: {
  mapId: number;
  initialTitle: string;
  initialSubject: string;
  initialNodes: MapNodeRow[];
  initialMaps: MapSummary[];
  initialDecks: DeckPicker[];
  initialNotes: NoteRow[];
  focusNodeId?: number;
  /** Node ids in this map that already have linked cards/notes. */
  initialLinkedNodeIds: number[];
}) {
  const router = useRouter();
  const [nodes, setNodes] = useState<MapNodeRow[]>(initialNodes);
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [paletteFor, setPaletteFor] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 90, y: 70 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [linkedCounts, setLinkedCounts] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const id of initialLinkedNodeIds) initial[id] = 1;
    return initial;
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [arranging, setArranging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const childrenOf = useMemo(() => {
    const m = new Map<number, MapNodeRow[]>();
    for (const n of nodes) {
      if (n.parentId == null) continue;
      const list = m.get(n.parentId) ?? [];
      list.push(n);
      m.set(n.parentId, list);
    }
    return m;
  }, [nodes]);
  const root = nodes.find((n) => n.parentId == null) ?? null;
  const selected = selectedId != null ? (nodeById.get(selectedId) ?? null) : null;

  /* Center the canvas on a node (used by deep links like /maps/1?node=12). */
  const centerOnNode = useCallback((node: MapNodeRow) => {
    const el = canvasRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setPan({ x: w / 2 - node.x * zoom, y: h / 2 - node.y * zoom });
  }, [zoom]);

  const selectNode = useCallback((node: MapNodeRow) => {
    setSelectedId(node.id);
    setPaletteFor(null);
    setPanelOpen(true);
  }, []);

  // Deep link: /maps/[id]?node=<id> selects, centers and opens that concept.
  const lastFocus = useRef<number | null>(null);
  useEffect(() => {
    if (focusNodeId == null || lastFocus.current === focusNodeId) return;
    const target = nodes.find((n) => n.id === focusNodeId);
    if (!target) return;
    lastFocus.current = focusNodeId;
    selectNode(target);
    centerOnNode(target);
  }, [focusNodeId, nodes, selectNode, centerOnNode]);

  const handleLinkCountChange = useCallback((nodeId: number, count: number) => {
    setLinkedCounts((prev) => ({ ...prev, [nodeId]: count }));
  }, []);

  /* ---------------- persistence helpers ---------------- */
  const patchNode = useCallback(
    async (id: number, patch: Partial<Pick<MapNodeRow, "label" | "x" | "y" | "color">>) => {
      setSaveState("saving");
      try {
        await fetch(`/api/nodes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        setSaveState("saved");
      } catch {
        setSaveState("saved");
      }
    },
    [],
  );

  async function commitTitle() {
    const next = draftTitle.trim();
    setEditingTitle(false);
    if (!next || next === title) {
      setDraftTitle(title);
      return;
    }
    setTitle(next);
    setSaveState("saving");
    await fetch(`/api/maps/${mapId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    setSaveState("saved");
    router.refresh();
  }

  /* ---------------- node actions ---------------- */
  async function addChild(parent: MapNodeRow) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/maps/${mapId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: parent.id, label: "New idea" }),
      });
      if (!res.ok) {
        setSaveState("saved");
        return;
      }
      const node: MapNodeRow = await res.json();
      setNodes((ns) => [...ns, node]);
      setSelectedId(node.id);
      setEditingId(node.id);
      setDraftLabel(node.label);
      setSaveState("saved");
      router.refresh();
    } catch {
      setSaveState("saved");
    }
  }

  async function deleteNode(node: MapNodeRow) {
    const kids = childrenOf.get(node.id) ?? [];
    setSaveState("saving");
    await fetch(`/api/nodes/${node.id}`, { method: "DELETE" });
    setNodes((ns) =>
      ns
        .filter((n) => n.id !== node.id)
        .map((n) =>
          kids.some((k) => k.id === n.id) ? { ...n, parentId: node.parentId } : n,
        ),
    );
    setSelectedId(null);
    setPaletteFor(null);
    setSaveState("saved");
    router.refresh();
  }

  function setNodeColor(node: MapNodeRow, color: string) {
    setNodes((ns) =>
      ns.map((n) => (n.id === node.id ? { ...n, color } : n)),
    );
    setPaletteFor(null);
    patchNode(node.id, { color });
  }

  function startEdit(node: MapNodeRow) {
    setEditingId(node.id);
    setDraftLabel(node.label);
  }

  function commitLabel() {
    if (editingId == null) return;
    const id = editingId;
    const label = draftLabel.trim() || "Untitled";
    setEditingId(null);
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, label } : n)));
    patchNode(id, { label });
  }

  /* ---------------- drag & pan ---------------- */
  const onNodePointerDown = (e: React.PointerEvent<HTMLDivElement>, node: MapNodeRow) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (editingId === node.id) return;
    selectNode(node);
    dragRef.current = {
      type: "node",
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: node.x,
      oy: node.y,
      dx: 0,
      dy: 0,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onNodePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.type !== "node") return;
    const dx = (e.clientX - d.startX) / zoom;
    const dy = (e.clientY - d.startY) / zoom;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    d.dx = dx;
    d.dy = dy;
    setNodes((ns) =>
      ns.map((n) => (n.id === d.id ? { ...n, x: d.ox + dx, y: d.oy + dy } : n)),
    );
  };

  const onNodePointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && d.type === "node" && d.moved) {
      patchNode(d.id, { x: Math.round(d.ox + d.dx), y: Math.round(d.oy + d.dy) });
    }
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setSelectedId(null);
    setPaletteFor(null);
    dragRef.current = {
      type: "pan",
      startX: e.clientX,
      startY: e.clientY,
      ox: pan.x,
      oy: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.type !== "pan") return;
    setPan({ x: d.ox + (e.clientX - d.startX), y: d.oy + (e.clientY - d.startY) });
  };

  const onCanvasPointerUp = () => {
    dragRef.current = null;
  };

  /* ---------------- zoom (non-passive wheel) ---------------- */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.93;
      setZoom((z) => Math.min(1.8, Math.max(0.35, z * factor)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------------- keyboard ---------------- */
  const deleteRef = useRef(deleteNode);
  deleteRef.current = deleteNode;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        setSelectedId(null);
        setPaletteFor(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId != null) {
        const n = nodeById.get(selectedId);
        if (n && n.parentId != null) deleteRef.current(n);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, nodeById]);

  /* ---------------- auto arrange ---------------- */
  async function autoArrange() {
    if (!root || arranging) return;
    setArranging(true);
    const positions = layoutTree(nodes, root.id);
    // keep the root exactly where it currently is
    const rootPos = positions.get(root.id);
    if (rootPos) {
      const shiftX = root.x - rootPos.x;
      const shiftY = root.y - rootPos.y;
      for (const p of positions.values()) {
        p.x = Math.round(p.x + shiftX);
        p.y = Math.round(p.y + shiftY);
      }
    }
    setNodes((ns) =>
      ns.map((n) => {
        const p = positions.get(n.id);
        return p ? { ...n, x: p.x, y: p.y } : n;
      }),
    );
    await Promise.all(
      nodes.map((n) => {
        const p = positions.get(n.id);
        if (!p) return null;
        return fetch(`/api/nodes/${n.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: p.x, y: p.y }),
        });
      }),
    );
    setArranging(false);
    setSaveState("saved");
    router.refresh();
  }

  /* ---------------- edges ---------------- */
  const edges = useMemo(() => {
    const out: { key: number; d: string; color: string }[] = [];
    for (const n of nodes) {
      if (n.parentId == null) continue;
      const p = nodeById.get(n.parentId);
      if (!p) continue;
      const dx = n.x - p.x;
      out.push({
        key: n.id,
        d: `M ${p.x} ${p.y} C ${p.x + dx * 0.5} ${p.y}, ${n.x - dx * 0.5} ${n.y}, ${n.x} ${n.y}`,
        color: n.color,
      });
    }
    return out;
  }, [nodes, nodeById]);

  const miniBtn = (isRoot: boolean) =>
    `flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors ${
      isRoot
        ? "bg-white/20 text-white hover:bg-white/35"
        : "bg-paper-2 text-ink-2 hover:bg-line hover:text-ink"
    }`;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ---------------- toolbar ---------------- */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-card/90 px-3 backdrop-blur sm:px-4">
        <Link href="/maps" className="btn-icon h-8 w-8" title="All maps">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {editingTitle ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setDraftTitle(title);
                setEditingTitle(false);
              }
            }}
            className="w-56 rounded-lg border border-accent/50 bg-card px-2 py-1 font-display text-lg font-semibold focus:outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraftTitle(title);
              setEditingTitle(true);
            }}
            className="group flex max-w-[260px] items-center gap-1.5 truncate rounded-lg px-2 py-1 font-display text-lg font-semibold transition-colors hover:bg-paper-2"
            title="Rename map"
          >
            <span className="truncate">{title}</span>
            <Wand2 className="h-3.5 w-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}

        <span className="chip hidden border border-line bg-card text-ink-2 md:inline-flex">
          {nodes.length} nodes
        </span>

        <div className="flex-1" />

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

        <div className="flex items-center rounded-full border border-line bg-card">
          <button
            onClick={() => setZoom((z) => Math.max(0.35, z - 0.15))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:text-ink"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-11 text-center text-xs font-semibold tabular-nums text-ink-2">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:text-ink"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={autoArrange}
          disabled={arranging || !root}
          className="btn-ghost h-8 px-3 text-xs"
          title="Tidy up the layout"
        >
          {arranging ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          Arrange
        </button>
      </div>

      {/* ---------------- canvas ---------------- */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:flex-1">
      <div
        ref={canvasRef}
        className="canvas-grid map-canvas relative min-h-0 flex-1 overflow-hidden"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
      >
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <svg
            className="absolute overflow-visible"
            width="1"
            height="1"
            style={{ left: 0, top: 0 }}
          >
            {edges.map((edge) => (
              <path
                key={edge.key}
                d={edge.d}
                fill="none"
                stroke={edge.color}
                strokeOpacity={0.55}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            ))}
          </svg>

          {nodes.map((node) => {
            const isRoot = node.parentId == null;
            const isSelected = selectedId === node.id;
            return (
              <div
                key={node.id}
                className="map-node absolute rounded-xl shadow-card transition-shadow"
                style={{
                  left: node.x,
                  top: node.y,
                  transform: "translate(-50%, -50%)",
                  width: NODE_W,
                  zIndex: isSelected ? 30 : 10,
                  ...(isRoot
                    ? {
                        backgroundColor: node.color,
                        borderColor: node.color,
                        color: "#ffffff",
                      }
                    : {
                        backgroundColor: "var(--card)",
                        borderColor: isSelected ? node.color : "var(--line)",
                        color: "var(--ink)",
                      }),
                  borderStyle: "solid",
                  borderWidth: isRoot ? 2 : 1,
                  borderLeftWidth: isRoot ? 2 : 4,
                  boxShadow: isSelected
                    ? `0 0 0 2px ${node.color}, 0 14px 34px -10px rgba(0,0,0,0.3)`
                    : undefined,
                }}
                onPointerDown={(e) => onNodePointerDown(e, node)}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onDoubleClick={() => startEdit(node)}
              >
                {(linkedCounts[node.id] ?? 0) > 0 && (
                  <span
                    className="absolute -top-2 -right-2 z-20 flex h-5 items-center gap-0.5 rounded-full border border-line bg-card px-1.5 text-[10px] font-bold text-accent shadow-card"
                    title="This concept has linked flashcards / notes"
                  >
                    <Link2 className="h-2.5 w-2.5" strokeWidth={2.5} />
                    {linkedCounts[node.id]}
                  </span>
                )}
                <div className={`p-3 ${isRoot ? "sm:p-4" : ""}`}>
                  {editingId === node.id ? (
                    <input
                      autoFocus
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitLabel();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={commitLabel}
                      className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                        isRoot ? "text-white placeholder:text-white/60" : ""
                      }`}
                      placeholder="Label…"
                    />
                  ) : (
                    <p
                      className={`text-sm leading-snug font-medium ${
                        isRoot ? "font-display text-base sm:text-lg" : ""
                      }`}
                    >
                      {node.label}
                    </p>
                  )}

                  {isSelected && editingId !== node.id && (
                    <div
                      className="mt-2 flex items-center gap-1.5 border-t border-dashed pt-2"
                      style={{
                        borderColor: isRoot
                          ? "rgba(255,253,247,0.35)"
                          : "var(--line)",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addChild(node);
                        }}
                        className={miniBtn(isRoot)}
                        title="Add child idea"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaletteFor(paletteFor === node.id ? null : node.id);
                        }}
                        className={miniBtn(isRoot)}
                        title="Change color"
                      >
                        <Palette className="h-3.5 w-3.5" />
                      </button>
                      {!isRoot && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node);
                          }}
                          className={miniBtn(isRoot)}
                          title="Delete node (children move up)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <span
                        className={`ml-auto text-[10px] font-medium ${
                          isRoot ? "text-white/70" : "text-ink-3"
                        }`}
                      >
                        {isRoot ? "root" : "drag me"}
                      </span>
                    </div>
                  )}
                </div>

                {paletteFor === node.id && (
                  <div
                    className="absolute top-full left-1/2 z-40 mt-2 flex -translate-x-1/2 gap-1.5 rounded-xl border border-line bg-card p-2 shadow-pop"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {NODE_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNodeColor(node, c);
                        }}
                        className="h-6 w-6 cursor-pointer rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: c === node.color ? "var(--ink)" : "transparent",
                        }}
                        aria-label={`Set color ${c}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* hint */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-40">
          <div className="chip border border-line bg-card/90 text-ink-2 shadow-card backdrop-blur">
            <MousePointerClick className="h-3.5 w-3.5" />
            Tap a concept to open its flashcards &amp; notes · drag to move ·
            scroll to zoom
          </div>
        </div>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-ink-3">
              Empty map — select the root node and press{" "}
              <span className="font-bold">+</span> to branch out.
            </p>
          </div>
        )}
      </div>

      {/* ---------- concept panel: linked flashcards & notes ---------- */}
      {panelOpen && selected && (
        <ConceptPanel
          node={selected}
          isRoot={selected.parentId == null}
          childCount={(childrenOf.get(selected.id) ?? []).length}
          mapSubject={initialSubject}
          maps={initialMaps}
          decks={initialDecks}
          notes={initialNotes}
          onClose={() => setPanelOpen(false)}
          onAddChild={() => addChild(selected)}
          onColorChange={(c) => setNodeColor(selected, c)}
          onDelete={() => deleteNode(selected)}
          onRename={(label) => {
            setNodes((ns) =>
              ns.map((n) => (n.id === selected.id ? { ...n, label } : n)),
            );
            patchNode(selected.id, { label });
          }}
          onLinkCountChange={handleLinkCountChange}
        />
      )}
      </div>
    </div>
  );
}

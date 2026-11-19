"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHASES, STEPS, connections, stepNumber } from "./steps";

const COL_W = 200;
const ROW_H = 66;
const PAD_X = 100;
const PAD_TOP = 76;

const MAX_ROWS = Math.max(
  ...PHASES.map((p) => STEPS.filter((s) => s.phase === p.n).length),
);
const GRAPH_W = PAD_X * 2 + (PHASES.length - 1) * COL_W;
const GRAPH_H = PAD_TOP + (MAX_ROWS - 1) * ROW_H + 64;

const POS: Record<string, { x: number; y: number }> = {};
for (const p of PHASES) {
  STEPS.filter((s) => s.phase === p.n).forEach((s, i) => {
    POS[s.id] = { x: PAD_X + (p.n - 1) * COL_W, y: PAD_TOP + i * ROW_H };
  });
}

const EDGES: [string, string][] = [];
for (const [a, list] of Object.entries(connections)) {
  for (const b of list) if (stepNumber(a) < stepNumber(b)) EDGES.push([a, b]);
}

function edgePath(a: string, b: string): string {
  const p = POS[a];
  const q = POS[b];
  if (p.x === q.x) {
    const off = 34 + Math.abs(q.y - p.y) * 0.22;
    return `M ${p.x} ${p.y} C ${p.x + off} ${p.y}, ${q.x + off} ${q.y}, ${q.x} ${q.y}`;
  }
  const dx = (q.x - p.x) / 2;
  return `M ${p.x} ${p.y} C ${p.x + dx} ${p.y}, ${q.x - dx} ${q.y}, ${q.x} ${q.y}`;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type View = { x: number; y: number; k: number };

export function ConnectionMap({
  done,
  onSelect,
}: {
  done: Set<string>;
  onSelect: (id: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef<View>(view);
  const [hover, setHover] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({
    moved: false,
    startX: 0,
    startY: 0,
    ox: 0,
    oy: 0,
    pinch: null as null | { dist: number; k: number; x: number; y: number; mx: number; my: number },
  });

  const apply = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);

  /* Lazy-load: only render the graph when it scrolls near the viewport. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fit = useCallback(() => {
    const el = svgRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const k = clamp(Math.min(w / GRAPH_W, h / GRAPH_H), 0.5, 1.1);
    apply({
      k,
      x: Math.max(0, (w - GRAPH_W * k) / 2),
      y: Math.max(0, (h - GRAPH_H * k) / 2),
    });
  }, [apply]);

  useEffect(() => {
    if (!visible) return;
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [visible, fit]);

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      const v = viewRef.current;
      const k = clamp(v.k * factor, 0.3, 2.5);
      const r = k / v.k;
      apply({ k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r });
    },
    [apply],
  );

  /* Ctrl/⌘ + wheel (and trackpad pinch) zooms; plain wheel scrolls the page. */
  useEffect(() => {
    const el = svgRef.current;
    if (!visible || !el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.1 : 0.9);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [visible, zoomAt]);

  function zoomButton(factor: number) {
    const el = svgRef.current;
    if (!el) return;
    zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor);
  }

  /* ---------------- pointer pan & pinch ---------------- */
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = viewRef.current;
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.moved = false;
      g.pinch = null;
      g.startX = e.clientX;
      g.startY = e.clientY;
      g.ox = v.x;
      g.oy = v.y;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const rect = e.currentTarget.getBoundingClientRect();
      g.moved = true;
      g.pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        k: v.k,
        x: v.x,
        y: v.y,
        mx: (a.x + b.x) / 2 - rect.left,
        my: (a.y + b.y) / 2 - rect.top,
      };
      for (const id of pointers.current.keys()) {
        try {
          e.currentTarget.setPointerCapture(id);
        } catch {
          /* ignore */
        }
      }
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;

    if (pointers.current.size >= 2 && g.pinch) {
      const [a, b] = [...pointers.current.values()];
      const rect = e.currentTarget.getBoundingClientRect();
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const k = clamp(g.pinch.k * (dist / g.pinch.dist), 0.3, 2.5);
      const wx = (g.pinch.mx - g.pinch.x) / g.pinch.k;
      const wy = (g.pinch.my - g.pinch.y) / g.pinch.k;
      const mx = (a.x + b.x) / 2 - rect.left;
      const my = (a.y + b.y) / 2 - rect.top;
      apply({ k, x: mx - wx * k, y: my - wy * k });
      return;
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      g.moved = true;
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    apply({ ...viewRef.current, x: g.ox + dx, y: g.oy + dy });
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 1) {
      // continue panning with the remaining finger after a pinch
      const [rest] = [...pointers.current.values()];
      g.pinch = null;
      g.startX = rest.x;
      g.startY = rest.y;
      g.ox = viewRef.current.x;
      g.oy = viewRef.current.y;
    }
    if (pointers.current.size === 0) setDragging(false);
  }

  function select(id: string) {
    if (gesture.current.moved) return; // was a drag, not a click
    onSelect(id);
  }

  const neighbors = hover ? new Set([hover, ...(connections[hover] ?? [])]) : null;

  return (
    <div ref={wrapRef} className="jss-graph">
      {!visible ? (
        <div className="jss-graph-loading">Loading connection map…</div>
      ) : (
        <>
          <div className="jss-graph-tools">
            <button type="button" className="jss-icon-btn" onClick={() => zoomButton(0.85)} aria-label="Zoom out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
            </button>
            <button type="button" className="jss-icon-btn" onClick={() => zoomButton(1.18)} aria-label="Zoom in">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <button type="button" className="jss-icon-btn" onClick={fit} aria-label="Reset view">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
          </div>

          <svg
            ref={svgRef}
            className={dragging ? "is-dragging" : ""}
            role="group"
            aria-label={`Connection map of all ${STEPS.length} study steps grouped by phase`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {PHASES.map((p) => {
                const x = PAD_X + (p.n - 1) * COL_W;
                return (
                  <g key={p.n} aria-hidden>
                    <text className="jss-col-title" x={x} y={30}>
                      {p.n}. {p.keyword}
                    </text>
                    <line className="jss-col-line" x1={x} y1={44} x2={x} y2={GRAPH_H - 24} />
                  </g>
                );
              })}

              {EDGES.map(([a, b]) => {
                const on = hover != null && (a === hover || b === hover);
                const cls = hover ? (on ? "is-on" : "is-dim") : "";
                return <path key={`${a}-${b}`} d={edgePath(a, b)} className={`jss-edge ${cls}`} />;
              })}

              {STEPS.map((s) => {
                const p = POS[s.id];
                const n = stepNumber(s.id);
                const isOn = hover === s.id;
                const dim = neighbors != null && !neighbors.has(s.id);
                const count = connections[s.id]?.length ?? 0;
                return (
                  <g
                    key={s.id}
                    className={`jss-node ${done.has(s.id) ? "is-done" : ""} ${isOn ? "is-on" : ""} ${dim ? "is-dim" : ""}`}
                    transform={`translate(${p.x} ${p.y})`}
                    tabIndex={0}
                    role="button"
                    aria-label={`Step ${n}: ${s.title}. Phase ${s.phase}. ${count} connections. Press Enter to jump to the card.`}
                    onMouseEnter={() => setHover(s.id)}
                    onMouseLeave={() => setHover((h) => (h === s.id ? null : h))}
                    onFocus={() => setHover(s.id)}
                    onBlur={() => setHover((h) => (h === s.id ? null : h))}
                    onClick={() => select(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(s.id);
                      }
                    }}
                  >
                    <title>{s.title}</title>
                    <circle r={14} />
                    <text className="n">{n}</text>
                    <text className="l" y={31}>
                      {truncate(s.title, 24)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          <p className="jss-graph-hint">
            Hover to trace links · drag to pan · pinch or Ctrl/⌘ + scroll to zoom
          </p>
        </>
      )}
    </div>
  );
}

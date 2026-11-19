import Link from "next/link";
import { Map as MapIcon, Plus } from "lucide-react";
import { getMapsWithNodes } from "@/lib/queries";
import { MapCreateDialog } from "@/components/map-create";
import { DeleteButton } from "@/components/delete-button";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MapsPage() {
  const maps = await getMapsWithNodes();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="animate-fade-up">
          <p className="eyebrow">Canvas</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Mind maps
          </h1>
          <p className="mt-3 max-w-xl text-ink-2">
            Branch ideas out from a central thought. Drag nodes, color them,
            and let the structure of the topic reveal itself.
          </p>
        </div>
        <MapCreateDialog />
      </div>

      {maps.length === 0 ? (
        <div className="paper-card mt-10 flex flex-col items-center gap-3 p-12 text-center">
          <MapIcon className="h-8 w-8 text-ink-3" />
          <p className="font-display text-xl">No maps yet</p>
          <p className="max-w-sm text-sm text-ink-2">
            Start with a central idea and branch out — even a 5-node map beats
            a wall of text.
          </p>
        </div>
      ) : (
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <div key={map.id} className="group relative">
              <Link
                href={`/maps/${map.id}`}
                className="paper-card block overflow-hidden transition-colors hover:border-ink-3"
              >
                <div className="canvas-grid border-b border-line">
                  <MapPreview nodes={map.nodes} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="chip border border-line bg-card text-ink-2">
                      {map.subject}
                    </span>
                    <span className="text-xs text-ink-3">
                      {map.nodes.length} nodes
                    </span>
                  </div>
                  <h2 className="mt-2.5 font-display text-xl font-medium group-hover:text-accent">
                    {map.title}
                  </h2>
                  <p className="mt-1 text-xs text-ink-3">
                    edited {timeAgo(map.updatedAt)}
                  </p>
                </div>
              </Link>
              <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                <DeleteButton url={`/api/maps/${map.id}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MapPreview({
  nodes,
}: {
  nodes: { id: number; parentId: number | null; label: string; x: number; y: number; color: string }[];
}) {
  if (nodes.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-ink-3">
        <MapIcon className="h-6 w-6" />
      </div>
    );
  }

  const W = 300;
  const H = 150;
  const P = 18;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((W - 2 * P) / spanX, (H - 2 * P) / spanY);
  const px = (x: number) => P + (x - minX) * scale;
  const py = (y: number) => P + (y - minY) * scale;

  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      {nodes.map((n) => {
        if (n.parentId == null) return null;
        const p = byId.get(n.parentId);
        if (!p) return null;
        return (
          <line
            key={`e-${n.id}`}
            x1={px(p.x)}
            y1={py(p.y)}
            x2={px(n.x)}
            y2={py(n.y)}
            stroke={n.color}
            strokeOpacity={0.45}
            strokeWidth={1.5}
          />
        );
      })}
      {nodes.map((n) => (
        <circle
          key={`n-${n.id}`}
          cx={px(n.x)}
          cy={py(n.y)}
          r={n.parentId == null ? 9 : 5.5}
          fill={n.color}
          fillOpacity={n.parentId == null ? 1 : 0.85}
        />
      ))}
    </svg>
  );
}

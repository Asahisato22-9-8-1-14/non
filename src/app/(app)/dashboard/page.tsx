import Link from "next/link";
import {
  ArrowRight,
  Layers3,
  Map as MapIcon,
  NotebookPen,
  Play,
} from "lucide-react";
import {
  getDecksWithStats,
  getMapsWithNodes,
  getNotes,
  getStats,
} from "@/lib/queries";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, decks, maps, notes] = await Promise.all([
    getStats(),
    getDecksWithStats(),
    getMapsWithNodes(),
    getNotes(),
  ]);

  const isEmpty = stats.decks === 0 && stats.maps === 0 && stats.notes === 0;
  const dueDecks = decks.filter((d) => d.due > 0);

  return (
    <div className="mx-auto max-w-5xl animate-fade-up px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-3">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Your study space
          </h1>
        </div>
        {dueDecks.length > 0 && (
          <Link href={`/study/${dueDecks[0].id}`} className="btn-primary">
            <Play className="h-3.5 w-3.5 fill-current" />
            Review {stats.dueToday} due
          </Link>
        )}
      </header>

      {/* stats */}
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
        <Stat label="Due today" value={stats.dueToday} accent={stats.dueToday > 0} />
        <Stat label="Day streak" value={stats.streak} />
        <Stat label="Flashcards" value={stats.totalCards} />
        <Stat label="Mind maps" value={stats.maps} />
        <Stat label="Notes" value={stats.notes} />
      </div>

      {isEmpty ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-ink-2">Get started</h2>
          <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-card">
            <Step
              n={1}
              href="/maps"
              icon={<MapIcon className="h-4 w-4" />}
              title="Map out a topic"
              body="Start with a central idea and branch out into concepts."
            />
            <Step
              n={2}
              href="/notes"
              icon={<NotebookPen className="h-4 w-4" />}
              title="Write notes"
              body="Capture explanations and link each note to a concept."
            />
            <Step
              n={3}
              href="/decks"
              icon={<Layers3 className="h-4 w-4" />}
              title="Make flashcards"
              body="Turn concepts into cards and review them with spaced repetition."
            />
          </div>
        </section>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <Panel title="Due for review" href="/decks">
            {dueDecks.length === 0 ? (
              <Empty text="Nothing due. You're all caught up." />
            ) : (
              dueDecks.slice(0, 5).map((d) => (
                <Row
                  key={d.id}
                  href={`/study/${d.id}`}
                  dot={d.color}
                  title={d.title}
                  meta={`${d.due} due`}
                />
              ))
            )}
          </Panel>

          <Panel title="Mind maps" href="/maps">
            {maps.length === 0 ? (
              <Empty text="No maps yet." />
            ) : (
              maps.slice(0, 5).map((m) => (
                <Row
                  key={m.id}
                  href={`/maps/${m.id}`}
                  dot={m.nodes[0]?.color ?? "var(--accent)"}
                  title={m.title}
                  meta={`${m.nodes.length} nodes`}
                />
              ))
            )}
          </Panel>

          <Panel title="Recent notes" href="/notes">
            {notes.length === 0 ? (
              <Empty text="No notes yet." />
            ) : (
              notes.slice(0, 5).map((n) => (
                <Row
                  key={n.id}
                  href={`/notes?note=${n.id}`}
                  title={n.title || "Untitled note"}
                  meta={timeAgo(n.updatedAt)}
                />
              ))
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-card px-4 py-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
          accent ? "text-accent" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Step({
  n,
  href,
  icon,
  title,
  body,
}: {
  n: number;
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper-2/60"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink-2">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          <span className="mr-2 text-ink-3 tabular-nums">{n}.</span>
          {title}
        </p>
        <p className="mt-0.5 text-sm text-ink-3">{body}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-2">{title}</h2>
        <Link href={href} className="text-xs text-ink-3 hover:text-ink">
          View all
        </Link>
      </div>
      <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-card">
        {children}
      </div>
    </section>
  );
}

function Row({
  href,
  title,
  meta,
  dot,
}: {
  href: string;
  title: string;
  meta: string;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-paper-2/60"
    >
      {dot && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
      )}
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <span className="shrink-0 text-xs text-ink-3">{meta}</span>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-sm text-ink-3">{text}</p>;
}

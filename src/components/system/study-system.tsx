"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./system.css";
import {
  PHASES,
  STEPS,
  STEP_BY_ID,
  TOTAL_STEPS,
  connections,
  stepNumber,
  type Step,
} from "./steps";
import {
  CheckIcon,
  ErrorAnalyser,
  FinalChecklist,
  FlashcardDemo,
  GrindeWidget,
  SirVisualizer,
} from "./widgets";
import dynamic from "next/dynamic";
import { applyTheme, readTheme } from "@/lib/theme";

// Code-split the graph: its JS is only fetched once the section nears the viewport.
const ConnectionMap = dynamic(
  () => import("./connection-map").then((m) => m.ConnectionMap),
  {
    ssr: false,
    loading: () => (
      <div className="jss-graph">
        <div className="jss-graph-loading">Loading connection map…</div>
      </div>
    ),
  },
);

function LazyConnectionMap(props: {
  done: Set<string>;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref}>
      {show ? (
        <ConnectionMap {...props} />
      ) : (
        <div className="jss-graph">
          <div className="jss-graph-loading">Connection map loads as you scroll…</div>
        </div>
      )}
    </div>
  );
}

const LS_DONE = "jss-completed";

function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function StudySystem() {
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [highlightPhase, setHighlightPhase] = useState<number | null>(null);
  const [navVisible, setNavVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePhase, setActivePhase] = useState(1);
  const [isDark, setIsDark] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const timers = useRef<number[]>([]);

  /* ---------- hydrate persisted state ---------- */
  useEffect(() => {
    setIsDark(readTheme() === "dark");
    try {
      const raw = localStorage.getItem(LS_DONE);
      if (raw) {
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) setDone(new Set(ids.filter((id) => STEP_BY_ID[id])));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_DONE, JSON.stringify([...done]));
    } catch {
      /* ignore */
    }
  }, [done, hydrated]);

  /* ---------- sticky nav + scroll spy ---------- */
  useEffect(() => {
    const onScroll = () => {
      const heroH = heroRef.current?.offsetHeight ?? 500;
      setNavVisible(window.scrollY > heroH - 140);
      let current = 1;
      for (const p of PHASES) {
        const el = document.getElementById(`phase-${p.n}`);
        if (el && el.getBoundingClientRect().top < 160) current = p.n;
      }
      setActivePhase(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  /* ---------- actions ---------- */
  function toggleTheme() {
    const next = readTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    setIsDark(next === "dark");
  }

  const toggleDone = useCallback((id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const goToStep = useCallback((id: string) => {
    setOpenId(null);
    setMenuOpen(false);
    setHighlightId(null);
    requestAnimationFrame(() => {
      const el = document.getElementById(`card-${id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      requestAnimationFrame(() => setHighlightId(id));
      later(() => setHighlightId((cur) => (cur === id ? null : cur)), 1600);
      // move keyboard focus to the target card without re-scrolling
      later(() => {
        el.querySelector<HTMLButtonElement>(".jss-card-main")?.focus({ preventScroll: true });
      }, 450);
    });
  }, []);

  const goToPhase = useCallback((n: number, highlight = false) => {
    setMenuOpen(false);
    const el = document.getElementById(`phase-${n}`);
    if (!el) return;
    el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    if (highlight) {
      setHighlightPhase(null);
      requestAnimationFrame(() => setHighlightPhase(n));
      later(() => setHighlightPhase((cur) => (cur === n ? null : cur)), 1600);
    }
  }, []);

  const goToSection = useCallback((id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }, []);

  const openStep = useCallback((id: string) => {
    if (!returnFocus.current) returnFocus.current = document.activeElement as HTMLElement | null;
    setOpenId(id);
  }, []);

  const closeStep = useCallback(() => {
    setOpenId(null);
    const el = returnFocus.current;
    returnFocus.current = null;
    requestAnimationFrame(() => el?.focus?.({ preventScroll: true }));
  }, []);

  const completed = done.size;
  const pct = Math.round((completed / TOTAL_STEPS) * 100);
  const openStepData = openId ? STEP_BY_ID[openId] : null;

  return (
    <div className="jss">
      {/* ---------- progress ---------- */}
      <div
        className="jss-progress"
        role="progressbar"
        aria-label="Steps completed"
        aria-valuemin={0}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={completed}
        aria-valuetext={`${completed} / ${TOTAL_STEPS} steps completed`}
      >
        <div className="jss-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* ---------- theme toggle ---------- */}
      <button
        type="button"
        className="jss-theme"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={isDark}
      >
        <svg className="jss-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <svg className="jss-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

      {/* ---------- sticky navbar ---------- */}
      <nav
        className={`jss-nav ${navVisible || menuOpen ? "is-visible" : ""}`}
        aria-label="Phases"
        aria-hidden={!navVisible && !menuOpen}
        inert={!navVisible && !menuOpen}
      >
        <div className="jss-nav-inner">
          <button type="button" className="jss-brand" onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}>
            Study System
          </button>
          <div className="jss-nav-pills">
            {PHASES.map((p) => (
              <button
                key={p.n}
                type="button"
                className={`jss-pill ${activePhase === p.n ? "is-active" : ""}`}
                aria-current={activePhase === p.n ? "true" : undefined}
                onClick={() => goToPhase(p.n)}
              >
                <span className="jss-pill-num">{p.n}</span>
                {p.name}
              </button>
            ))}
            <button type="button" className="jss-pill" onClick={() => goToSection("connections")}>
              Connections
            </button>
          </div>
          <span className="jss-nav-progress">
            {completed} / {TOTAL_STEPS} steps completed
          </span>
          <button
            type="button"
            className="jss-burger"
            aria-label={menuOpen ? "Close phase menu" : "Open phase menu"}
            aria-expanded={menuOpen}
            aria-controls="jss-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="jss-menu" className="jss-menu" role="menu">
          {PHASES.map((p) => (
            <button
              key={p.n}
              type="button"
              role="menuitem"
              className={activePhase === p.n ? "is-active" : ""}
              onClick={() => goToPhase(p.n)}
            >
              <span>{p.n}</span>
              {p.name}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => goToSection("connections")}>
            <span>↔</span>
            Connection map
          </button>
          <button type="button" role="menuitem" onClick={() => goToSection("cheatsheet")}>
            <span>★</span>
            Cheatsheet
          </button>
          <p className="jss-menu-meta">
            {completed} / {TOTAL_STEPS} steps completed
          </p>
        </div>
      )}

      {/* ---------- hero ---------- */}
      <header ref={heroRef} className="jss-hero">
        <div className="jss-container">
          <h1>Study Like a Learning Scientist.</h1>
          <p className="jss-hero-sub">
            An end-to-end system based on Dr. Justin Sung&apos;s methods.
          </p>
          <div className="jss-hero-pills" role="navigation" aria-label="Jump to a phase">
            {PHASES.map((p) => (
              <button key={p.n} type="button" className="jss-pill" onClick={() => goToPhase(p.n, true)}>
                <span className="jss-pill-num">{p.n}</span>
                {p.name}
              </button>
            ))}
          </div>
          <div className="jss-hero-meta">
            <span className="jss-meter" aria-hidden>
              <span className="jss-meter-track">
                <span className="jss-meter-fill" style={{ width: `${pct}%`, display: "block" }} />
              </span>
              {completed} / {TOTAL_STEPS} steps completed
            </span>
            <a href="/dashboard">Open the study app →</a>
          </div>
        </div>
      </header>

      {/* ---------- phases ---------- */}
      <main>
        {PHASES.map((phase) => {
          const steps = STEPS.filter((s) => s.phase === phase.n);
          const phaseDone = steps.filter((s) => done.has(s.id)).length;
          return (
            <section
              key={phase.n}
              id={`phase-${phase.n}`}
              className={`jss-phase ${highlightPhase === phase.n ? "is-highlight" : ""}`}
              aria-labelledby={`phase-${phase.n}-title`}
            >
              <span className="jss-phase-badge" aria-hidden>
                {String(phase.n).padStart(2, "0")}
              </span>
              <div className="jss-container">
                <p className="jss-eyebrow">
                  Phase {phase.n} · {phase.keyword}
                </p>
                <h2 id={`phase-${phase.n}-title`}>{phase.name}</h2>
                <p className="jss-goal">{phase.goal}</p>
                <p className="jss-phase-meta">
                  <span className="jss-meter-track" aria-hidden>
                    <span
                      className="jss-meter-fill"
                      style={{ width: `${(phaseDone / steps.length) * 100}%`, display: "block" }}
                    />
                  </span>
                  {phaseDone} of {steps.length} completed
                </p>

                <div className="jss-grid">
                  {steps.map((step) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      done={done.has(step.id)}
                      highlighted={highlightId === step.id}
                      onOpen={() => openStep(step.id)}
                      onToggle={() => toggleDone(step.id)}
                    />
                  ))}
                </div>

                {phase.n === 2 && <GrindeWidget />}
                {phase.n === 5 && <FlashcardDemo />}
                {phase.n === 6 && <ErrorAnalyser goToStep={goToStep} />}
                {phase.n === 7 && <SirVisualizer />}
                {phase.n === 8 && <FinalChecklist />}
              </div>
            </section>
          );
        })}

        {/* ---------- connection map ---------- */}
        <section id="connections" className="jss-map-section" aria-labelledby="connections-title">
          <div className="jss-container">
            <p className="jss-eyebrow">Interconnection</p>
            <h2 id="connections-title" className="jss-section-title">
              Every step connects
            </h2>
            <p className="jss-goal">
              All {TOTAL_STEPS} steps, grouped by phase. Hover a node to trace
              its links; click it to jump to the card.
            </p>
            <LazyConnectionMap done={done} onSelect={goToStep} />
          </div>
        </section>

        {/* ---------- cheatsheet ---------- */}
        <section id="cheatsheet" className="jss-cheat" aria-labelledby="cheat-title">
          <div className="jss-container">
            <p className="jss-eyebrow">Simple version</p>
            <h2 id="cheat-title" className="jss-section-title">
              The whole system in eight words
            </h2>
            <p className="jss-goal">Click a word to jump to its phase.</p>
            <div className="jss-cheat-row">
              {PHASES.map((p, i) => (
                <span key={p.n} style={{ display: "contents" }}>
                  <button type="button" className="jss-chip" onClick={() => goToPhase(p.n, true)}>
                    <small>{p.n}</small>
                    {p.keyword}
                  </button>
                  {i < PHASES.length - 1 && (
                    <span className="jss-arrow" aria-hidden>
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="jss-footer">
        <div className="jss-container jss-footer-inner">
          <p>Based on the research and methods of Dr. Justin Sung.</p>
          <nav aria-label="Sources">
            <a href="https://www.youtube.com/@JustinSung" target="_blank" rel="noopener noreferrer">
              YouTube channel
            </a>
            <a href="https://www.icanstudy.com" target="_blank" rel="noopener noreferrer">
              ICanStudy
            </a>
            <a
              href="https://www.reddit.com/search/?q=justin%20sung%20study%20system"
              target="_blank"
              rel="noopener noreferrer"
            >
              Reddit discussion
            </a>
            <a href="/dashboard">Study app</a>
          </nav>
        </div>
      </footer>

      {/* ---------- detail panel ---------- */}
      {openStepData && (
        <DetailPanel
          step={openStepData}
          done={done.has(openStepData.id)}
          onClose={closeStep}
          onToggle={() => toggleDone(openStepData.id)}
          onGo={goToStep}
          onOpen={openStep}
        />
      )}
    </div>
  );
}

/* ================================================================
   Step card
   ================================================================ */

function StepCard({
  step,
  done,
  highlighted,
  onOpen,
  onToggle,
}: {
  step: Step;
  done: boolean;
  highlighted: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const n = stepNumber(step.id);
  const links = connections[step.id]?.length ?? 0;
  return (
    <article
      id={`card-${step.id}`}
      className={`jss-card ${done ? "is-done" : ""} ${highlighted ? "is-highlight" : ""}`}
    >
      <button
        type="button"
        className="jss-card-main"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`Step ${n}: ${step.title}. ${step.description} ${done ? "Completed." : ""} Open details.`}
      >
        <span className="jss-card-top">
          <span className="jss-num">{n}</span>
          <span className="jss-emoji" aria-hidden>
            {step.emoji}
          </span>
        </span>
        <span className="jss-card-title" style={{ display: "block" }}>
          {step.title}
        </span>
        <span className="jss-card-desc" style={{ display: "block" }}>
          {step.description}
        </span>
        <span className="jss-card-more">
          Details · {links} {links === 1 ? "link" : "links"}
        </span>
      </button>
      <span className="jss-check">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          aria-label={`Mark step ${n}, ${step.title}, as completed`}
        />
        <span className="jss-check-box" aria-hidden>
          <CheckIcon />
        </span>
      </span>
    </article>
  );
}

/* ================================================================
   Detail panel (drawer on desktop, full-screen modal on mobile)
   ================================================================ */

function DetailPanel({
  step,
  done,
  onClose,
  onToggle,
  onGo,
  onOpen,
}: {
  step: Step;
  done: boolean;
  onClose: () => void;
  onToggle: () => void;
  onGo: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const n = stepNumber(step.id);
  const phase = PHASES[step.phase - 1];
  const related = connections[step.id] ?? [];
  const prev = STEP_BY_ID[`step_${n - 1}`];
  const next = STEP_BY_ID[`step_${n + 1}`];

  useEffect(() => {
    closeRef.current?.focus();
  }, [step.id]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // simple focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="jss-overlay" onClick={onClose}>
      <aside
        ref={dialogRef}
        className="jss-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jss-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jss-drawer-head">
          <p className="jss-drawer-phase">
            <strong>Phase {phase.n}</strong> · {phase.name}
          </p>
          <button ref={closeRef} type="button" className="jss-icon-btn" onClick={onClose} aria-label="Close details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="jss-drawer-body" key={step.id}>
          <div className="jss-drawer-title-row">
            <span className="jss-drawer-emoji" aria-hidden>
              {step.emoji}
            </span>
            <div>
              <p className="jss-drawer-step">Step {n} of {TOTAL_STEPS}</p>
              <h3 id="jss-detail-title">{step.title}</h3>
            </div>
          </div>

          <p className="jss-drawer-desc">{step.description}</p>
          <p className="jss-drawer-text">{step.fullExplanation}</p>

          <div className="jss-insight">
            <strong>Insight</strong>
            {step.insight}
          </div>

          <p className="jss-subhead">Related steps</p>
          <div className="jss-related">
            {related.map((id) => {
              const r = STEP_BY_ID[id];
              return (
                <button
                  key={id}
                  type="button"
                  className="jss-pill"
                  onClick={() => onGo(id)}
                  aria-label={`Go to step ${stepNumber(id)}: ${r.title}, in phase ${r.phase}`}
                >
                  <span className="jss-pill-num">{stepNumber(id)}</span>
                  {r.title}
                </button>
              );
            })}
          </div>

          <label className={`jss-practise ${done ? "is-done" : ""}`}>
            <span className="jss-check">
              <input
                type="checkbox"
                checked={done}
                onChange={onToggle}
                aria-label={`Practise this — mark step ${n} as done`}
              />
              <span className="jss-check-box" aria-hidden>
                <CheckIcon />
              </span>
            </span>
            {done ? "Practised — marked as done" : "Practise this"}
          </label>
        </div>

        <div className="jss-drawer-foot">
          <button type="button" className="jss-btn" disabled={!prev} onClick={() => prev && onOpen(prev.id)}>
            ← Previous
          </button>
          <button type="button" className="jss-btn" disabled={!next} onClick={() => next && onOpen(next.id)}>
            Next →
          </button>
        </div>
      </aside>
    </div>
  );
}

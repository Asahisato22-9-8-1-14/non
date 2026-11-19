"use client";

import { useEffect, useRef, useState } from "react";
import { STEP_BY_ID, stepNumber } from "./steps";

type GoToStep = (id: string) => void;

/* ================================================================
   GRINDE Framework (Phase 2)
   ================================================================ */

const GRINDE = [
  {
    key: "G",
    name: "Grouped",
    desc: "Cluster related ideas into chunks so the map has a few clear regions instead of scattered words.",
    example: "Gather four separate causes under one branch labelled 'Causes'.",
  },
  {
    key: "R",
    name: "Relational",
    desc: "Show how ideas relate to each other — not just that they exist side by side.",
    example: "Draw 'increases →' between two concepts instead of listing them.",
  },
  {
    key: "I",
    name: "Interconnected",
    desc: "Link ideas across different groups to reveal the deeper structure of the topic.",
    example: "Connect a detail in one branch to a principle in a distant branch.",
  },
  {
    key: "N",
    name: "Non-verbal",
    desc: "Let images, symbols and position carry meaning, using as few words as possible.",
    example: "Replace the phrase 'the cycle repeats' with a looping arrow icon.",
  },
  {
    key: "D",
    name: "Directional",
    desc: "Use arrows and flow to show cause, sequence and dependency at a glance.",
    example: "Lay a process out left-to-right so the map reads like a timeline.",
  },
  {
    key: "E",
    name: "Emphasized",
    desc: "Give important ideas more visual weight — size, colour, boldness — so priority is obvious.",
    example: "Make the core principle the largest, boldest node on the page.",
  },
];

export function GrindeWidget() {
  const [active, setActive] = useState(0);
  const item = GRINDE[active];

  return (
    <div className="jss-widget" aria-labelledby="grinde-title">
      <div className="jss-widget-head">
        <div>
          <p className="jss-widget-label">Interactive</p>
          <h3 id="grinde-title">GRINDE Framework</h3>
          <p className="jss-widget-sub">
            Six principles that turn a mind map from decoration into a thinking
            tool. Pick one to see what it means in practice.
          </p>
        </div>
      </div>

      <div className="jss-grinde-pills" role="group" aria-label="GRINDE principles">
        {GRINDE.map((g, i) => (
          <button
            key={g.key}
            type="button"
            className={`jss-pill ${i === active ? "is-active" : ""}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            <b>{g.key}</b>
            {g.name.slice(1)}
          </button>
        ))}
      </div>

      <div className="jss-grinde-body">
        <div className="jss-panel jss-grinde-detail" key={item.key} aria-live="polite">
          <span className="jss-grinde-letter" aria-hidden>
            {item.key}
          </span>
          <div>
            <h4>{item.name}</h4>
            <p>{item.desc}</p>
          </div>
        </div>

        <ul className="jss-panel jss-examples" aria-label="Examples">
          {GRINDE.map((g, i) => (
            <li key={g.key} className={i === active ? "is-on" : ""}>
              <b>{g.key}</b>
              <span>{g.example}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ================================================================
   Flashcard demo (Phase 5)
   ================================================================ */

const DEMO_CARDS = [
  { q: "What does the 'S' in SIR stand for?", a: "Spaced — reviews are spread over increasing intervals." },
  { q: "Why is rereading a weak study method?", a: "It builds familiarity, which feels like knowing, without practising recall." },
  { q: "What is priming?", a: "A quick pre-study skim that builds a rough outline before detailed learning." },
  { q: "What should a single flashcard contain?", a: "One atomic idea, phrased as a clear question." },
  { q: "What makes a mind map non-linear?", a: "Ideas are placed by their relationships, not in reading order." },
  { q: "When should you memorise instead of understand?", a: "Only for arbitrary facts that can't be derived from a principle." },
  { q: "What is interleaving?", a: "Mixing different topics or problem types within one session." },
  { q: "What is an error log for?", a: "Turning individual mistakes into visible, fixable patterns." },
  { q: "What does explaining it simply reveal?", a: "Hidden gaps — wherever you need jargon, understanding is thin." },
  { q: "Why redraw a map from memory?", a: "It tests structure and relationships, not just isolated facts." },
];

export function FlashcardDemo() {
  const [queue, setQueue] = useState<number[]>(() => DEMO_CARDS.map((_, i) => i));
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState(0);
  const total = DEMO_CARDS.length;
  const current = queue[0];

  function answer(gotIt: boolean) {
    if (current == null) return;
    setFlipped(false);
    // wait for the flip-back before swapping content
    window.setTimeout(() => {
      setQueue((q) => (gotIt ? q.slice(1) : [...q.slice(1), q[0]]));
      if (gotIt) setMastered((m) => m + 1);
    }, 180);
  }

  function reset() {
    setQueue(DEMO_CARDS.map((_, i) => i));
    setMastered(0);
    setFlipped(false);
  }

  return (
    <div className="jss-widget" aria-labelledby="fc-title">
      <div className="jss-widget-head">
        <div>
          <p className="jss-widget-label">Demo</p>
          <h3 id="fc-title">Flashcard practice</h3>
          <p className="jss-widget-sub">
            Recall first, then flip. Honest ratings decide what comes back.
          </p>
        </div>
        <span className="jss-counter" aria-live="polite">
          {queue.length} / {total} due today
        </span>
      </div>

      {current == null ? (
        <div className="jss-fc-done">
          <h4 style={{ fontSize: 18, fontWeight: 600 }}>All caught up 🎉</h4>
          <p>You cleared {mastered} cards. Spaced repetition would bring them back tomorrow.</p>
          <button type="button" className="jss-btn" onClick={reset}>
            Reset demo
          </button>
        </div>
      ) : (
        <>
          <div className="jss-fc-scene">
            <button
              type="button"
              className={`jss-fc ${flipped ? "is-flipped" : ""}`}
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? `Answer: ${DEMO_CARDS[current].a}. Click to flip back.` : `Question: ${DEMO_CARDS[current].q}. Click to reveal the answer.`}
            >
              <span className="jss-fc-face">
                <span className="jss-fc-tag">Question</span>
                <span className="jss-fc-text">{DEMO_CARDS[current].q}</span>
                <span className="jss-fc-hint">Click to flip</span>
              </span>
              <span className="jss-fc-face jss-fc-back" aria-hidden={!flipped}>
                <span className="jss-fc-tag">Answer</span>
                <span className="jss-fc-text">{DEMO_CARDS[current].a}</span>
              </span>
            </button>
          </div>
          <div className="jss-fc-actions">
            <button type="button" className="jss-btn" onClick={() => answer(false)} disabled={!flipped}>
              Needs review
            </button>
            <button type="button" className="jss-btn jss-btn-primary" onClick={() => answer(true)} disabled={!flipped}>
              Got it
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================
   Practice-question analyser (Phase 6)
   ================================================================ */

const ERRORS = [
  {
    cause: "I didn't know the fact",
    fix: "Make a flashcard",
    detail: "Write one atomic card for the missing fact and attach it to its concept on your map so it has context.",
    step: "step_29",
  },
  {
    cause: "I misunderstood the concept",
    fix: "Revise the mind map",
    detail: "Redraw the relationships around this concept. A misunderstanding usually means a missing or wrong connection.",
    step: "step_13",
  },
  {
    cause: "I used the wrong method",
    fix: "Compare and contrast methods",
    detail: "Put the correct and incorrect methods side by side and write down exactly when each one applies.",
    step: "step_15",
  },
  {
    cause: "I misread the question",
    fix: "Analyse the question itself",
    detail: "Underline key terms and restate the question in your own words before answering. Log it as a reading error.",
    step: "step_34",
  },
  {
    cause: "I ran out of time",
    fix: "Practise under time pressure",
    detail: "Do timed sets and note where you hesitate — slow answers often point to shaky understanding.",
    step: "step_37",
  },
  {
    cause: "Careless calculation error",
    fix: "Log it and add a check routine",
    detail: "Record it in your error log and build a 30-second checking habit for the step where it happened.",
    step: "step_38",
  },
];

export function ErrorAnalyser({ goToStep }: { goToStep: GoToStep }) {
  const [choice, setChoice] = useState<number | null>(null);
  const item = choice != null ? ERRORS[choice] : null;
  const step = item ? STEP_BY_ID[item.step] : null;

  return (
    <div className="jss-widget" aria-labelledby="ea-title">
      <div className="jss-widget-head">
        <div>
          <p className="jss-widget-label">Interactive</p>
          <h3 id="ea-title">Practice-question analyser</h3>
          <p className="jss-widget-sub">
            Got a question wrong? Choose the real cause to see the right fix.
          </p>
        </div>
      </div>

      <label htmlFor="ea-select" className="jss-sr">
        Why did you get it wrong?
      </label>
      <select
        id="ea-select"
        className="jss-select"
        value={choice ?? ""}
        onChange={(e) => setChoice(e.target.value === "" ? null : Number(e.target.value))}
      >
        <option value="">Why did you get it wrong?</option>
        {ERRORS.map((e, i) => (
          <option key={e.cause} value={i}>
            {e.cause}
          </option>
        ))}
      </select>

      {item && step && (
        <div className="jss-panel jss-fix" key={item.cause} aria-live="polite">
          <p className="jss-fix-label">Recommended fix</p>
          <p className="jss-fix-title">{item.fix}</p>
          <p>{item.detail}</p>
          <button type="button" className="jss-btn jss-btn-primary" onClick={() => goToStep(step.id)}>
            Go to step {stepNumber(step.id)}: {step.title} →
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SIR visualiser + review timeline (Phase 7)
   ================================================================ */

const SIR = [
  { key: "S", name: "Spaced", cx: 150, cy: 52, def: "Spread reviews across increasing intervals so each one happens just before you'd forget." },
  { key: "I", name: "Interleaved", cx: 60, cy: 180, def: "Mix topics and problem types so you practise choosing the right knowledge, not just using it." },
  { key: "R", name: "Retrieval", cx: 240, cy: 180, def: "Recall from memory before checking — effortful recall is what strengthens the memory." },
];

const TIMELINE = [
  { day: 0, what: "Learn it: build the map, deepen understanding and do a first brain-dump." },
  { day: 1, what: "First review: redraw the map from memory and run through your flashcards." },
  { day: 3, what: "Second review: blank-page recall plus a handful of practice questions." },
  { day: 7, what: "Third review: interleave with other topics and add new links to the map." },
  { day: 14, what: "Fourth review: timed practice questions; log and repair every error." },
  { day: 30, what: "Consolidate: full brain-dump and fold the topic into your master map." },
];

export function SirVisualizer() {
  const [sir, setSir] = useState(0);
  const [tl, setTl] = useState(0);
  const [play, setPlay] = useState(false);
  const tlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tlRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setPlay(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlay(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = SIR[sir];

  return (
    <div className="jss-widget" aria-labelledby="sir-title">
      <div className="jss-widget-head">
        <div>
          <p className="jss-widget-label">Interactive</p>
          <h3 id="sir-title">SIR review model</h3>
          <p className="jss-widget-sub">
            Effective review is Spaced, Interleaved and Retrieval-based. Hover
            or focus each circle.
          </p>
        </div>
      </div>

      <div className="jss-sir">
        <svg viewBox="0 0 300 232" role="group" aria-label="Spaced, Interleaved, Retrieval diagram">
          <line className="jss-sir-link" x1={150} y1={52} x2={60} y2={180} />
          <line className="jss-sir-link" x1={150} y1={52} x2={240} y2={180} />
          <line className="jss-sir-link" x1={60} y1={180} x2={240} y2={180} />
          {SIR.map((s, i) => (
            <g
              key={s.key}
              className={`jss-sir-node ${i === sir ? "is-on" : ""}`}
              tabIndex={0}
              role="button"
              aria-label={`${s.name}: ${s.def}`}
              aria-pressed={i === sir}
              onMouseEnter={() => setSir(i)}
              onFocus={() => setSir(i)}
              onClick={() => setSir(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSir(i);
                }
              }}
            >
              <circle cx={s.cx} cy={s.cy} r={40} />
              <text x={s.cx} y={s.cy}>
                {s.key}
              </text>
            </g>
          ))}
        </svg>

        <div className="jss-panel jss-sir-def" aria-live="polite">
          <h4>
            {active.key} — {active.name}
          </h4>
          <p>{active.def}</p>
        </div>
      </div>

      <div ref={tlRef} className={`jss-timeline ${play ? "is-play" : ""}`}>
        <div className="jss-tl-track" aria-hidden />
        <div className="jss-tl-fill" aria-hidden />
        <div className="jss-tl-dots" role="group" aria-label="Recommended review intervals">
          {TIMELINE.map((t, i) => (
            <button
              key={t.day}
              type="button"
              className={`jss-tl-dot ${i === tl ? "is-on" : ""}`}
              style={{ ["--i" as string]: i } as React.CSSProperties}
              onMouseEnter={() => setTl(i)}
              onFocus={() => setTl(i)}
              onClick={() => setTl(i)}
              aria-label={`Day ${t.day}: ${t.what}`}
              aria-pressed={i === tl}
            >
              <span className="dot" aria-hidden />
              Day {t.day}
            </button>
          ))}
        </div>
      </div>
      <div className="jss-panel jss-tl-info" aria-live="polite">
        <strong>Day {TIMELINE[tl].day}.</strong> {TIMELINE[tl].what}
      </div>
    </div>
  );
}

/* ================================================================
   Final checklist (Phase 8)
   ================================================================ */

const CHECKLIST = [
  "Master map combined from all sessions.",
  "Full brain-dump from memory.",
  "Completed at least 2 full practice papers under exam conditions.",
  "All mistakes sorted and repaired.",
  "Recurring weaknesses have a fix assigned.",
  "Can explain every major topic from memory.",
];

const LS_CHECKLIST = "jss-final-checklist";

export function FinalChecklist() {
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => false));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CHECKLIST);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setChecked(CHECKLIST.map((_, i) => Boolean(parsed[i])));
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_CHECKLIST, JSON.stringify(checked));
    } catch {
      /* ignore */
    }
  }, [checked, ready]);

  const count = checked.filter(Boolean).length;

  return (
    <div className="jss-widget" aria-labelledby="cl-title">
      <div className="jss-widget-head">
        <div>
          <p className="jss-widget-label">Checklist</p>
          <h3 id="cl-title">Final exam readiness</h3>
          <p className="jss-widget-sub">Tick each item only when it's genuinely true.</p>
        </div>
        <span className="jss-counter" aria-live="polite">
          {count} / {CHECKLIST.length} ready
        </span>
      </div>

      <ul className="jss-checklist">
        {CHECKLIST.map((text, i) => (
          <li key={text} className={checked[i] ? "is-done" : ""}>
            <label>
              <span className="jss-check">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() =>
                    setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
                  }
                  aria-label={text}
                />
                <span className="jss-check-box" aria-hidden>
                  <CheckIcon />
                </span>
              </span>
              <span className="jss-cl-num">{i + 1}.</span>
              <span className="jss-cl-text">{text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

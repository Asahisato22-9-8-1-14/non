/* StudyX offline UI. Everything is rendered from local state; there is no
 * network requests, no remote scripts and no dependency on a running server. */
(function () {
  "use strict";

  var L = window.MindloomLogic;
  var D = window.STUDY_DATA;
  var view = document.getElementById("view");
  if (!L || !D) {
    view.innerHTML = '<p class="empty">Offline data is missing. Please reinstall the app.</p>';
    return;
  }

  var storage = window.localStorage;
  var state = L.loadState(storage, Date.now());
  var ui = {
    keepScroll: false,
    openSteps: {},
    grinde: 0,
    error: null,
    sir: 0,
    timeline: 0,
    demo: null,
    study: null,
    noteId: null,
    editCardId: null,
    selectedNode: null,
    armed: null,
  };
  // Screen stack for Android's hardware back button.
  var nav = { stack: [], lastExitPress: 0 };

  /* ------------------------------ content ------------------------------ */
  var GRINDE = [
    { key: "G", name: "Grouped", desc: "Cluster related ideas into chunks so the map has a few clear regions instead of scattered words.", example: "Gather four separate causes under one branch labelled 'Causes'." },
    { key: "R", name: "Relational", desc: "Show how ideas relate to each other — not just that they exist side by side.", example: "Draw 'increases →' between two concepts instead of listing them." },
    { key: "I", name: "Interconnected", desc: "Link ideas across different groups to reveal the deeper structure of the topic.", example: "Connect a detail in one branch to a principle in a distant branch." },
    { key: "N", name: "Non-verbal", desc: "Let images, symbols and position carry meaning, using as few words as possible.", example: "Replace the phrase 'the cycle repeats' with a looping arrow icon." },
    { key: "D", name: "Directional", desc: "Use arrows and flow to show cause, sequence and dependency at a glance.", example: "Lay a process out left-to-right so it reads like a timeline." },
    { key: "E", name: "Emphasized", desc: "Give important ideas more visual weight — size, colour, boldness — so priority is obvious.", example: "Make the core principle the largest, boldest node on the page." },
  ];
  var DEMO_CARDS = [
    ["What does the 'S' in SIR stand for?", "Spaced — reviews are spread over increasing intervals."],
    ["Why is rereading a weak study method?", "It builds familiarity, which feels like knowing, without practising recall."],
    ["What is priming?", "A quick pre-study skim that builds a rough outline before detailed learning."],
    ["What should a single flashcard contain?", "One atomic idea, phrased as a clear question."],
    ["What makes a mind map non-linear?", "Ideas are placed by their relationships, not in reading order."],
    ["When should you memorise instead of understand?", "Only for arbitrary facts that can't be derived from a principle."],
    ["What is interleaving?", "Mixing different topics or problem types within one session."],
    ["What is an error log for?", "Turning individual mistakes into visible, fixable patterns."],
    ["What does explaining it simply reveal?", "Hidden gaps — wherever you need jargon, understanding is thin."],
    ["Why redraw a map from memory?", "It tests structure and relationships, not just isolated facts."],
  ];
  var ERRORS = [
    { cause: "I didn't know the fact", fix: "Make a flashcard", detail: "Write one atomic card for the missing fact and attach it to its concept on your map so it has context.", step: 29 },
    { cause: "I misunderstood the concept", fix: "Revise the mind map", detail: "Redraw the relationships around this concept. A misunderstanding usually means a missing or wrong connection.", step: 13 },
    { cause: "I used the wrong method", fix: "Compare and contrast methods", detail: "Put the correct and incorrect methods side by side and write down exactly when each one applies.", step: 15 },
    { cause: "I misread the question", fix: "Analyse the question itself", detail: "Underline key terms and restate the question in your own words before answering. Log it as a reading error.", step: 34 },
    { cause: "I ran out of time", fix: "Practise under time pressure", detail: "Do timed sets and note where you hesitate — slow answers often point to shaky understanding.", step: 37 },
    { cause: "Careless calculation error", fix: "Log it and add a check routine", detail: "Record it in your error log and build a 30-second checking habit for the step where it happened.", step: 38 },
  ];
  var SIR = [
    { key: "S", name: "Spaced", def: "Spread reviews across increasing intervals so each one happens just before you'd forget." },
    { key: "I", name: "Interleaved", def: "Mix topics and problem types so you practise choosing the right knowledge, not just using it." },
    { key: "R", name: "Retrieval", def: "Recall from memory before checking — effortful recall is what strengthens the memory." },
  ];
  var TIMELINE = [
    { day: 0, what: "Learn it: build the map, deepen understanding and do a first brain-dump." },
    { day: 1, what: "First review: redraw the map from memory and run through your flashcards." },
    { day: 3, what: "Second review: blank-page recall plus a handful of practice questions." },
    { day: 7, what: "Third review: interleave with other topics and add new links to the map." },
    { day: 14, what: "Fourth review: timed practice questions; log and repair every error." },
    { day: 30, what: "Consolidate: full brain-dump and fold the topic into your master map." },
  ];
  var CHECKLIST = [
    "Master map combined from all sessions.",
    "Full brain-dump from memory.",
    "Completed at least 2 full practice papers under exam conditions.",
    "All mistakes sorted and repaired.",
    "Recurring weaknesses have a fix assigned.",
    "Can explain every major topic from memory.",
  ];
  var RATING_META = {
    again: { label: "Again", hint: "10 min" },
    hard: { label: "Hard", hint: "1 day" },
    good: { label: "Good", hint: "3 days" },
    easy: { label: "Easy", hint: "7 days" },
  };
  var BOX_LABELS = { 1: "Learning", 2: "Familiar", 3: "Solid", 4: "Strong", 5: "Mastered" };
  var NODE_COLORS = ["#5b5bd6", "#12a372", "#e3a33f", "#e05a6b", "#3b82f6", "#8b5cf6"];

  /* ------------------------------ helpers ------------------------------ */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeColor(c) { return /^#[0-9a-f]{6}$/i.test(c || "") ? c : "#5b5bd6"; }
  function stepNo(id) { return Number(String(id).replace("step_", "")); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function now() { return Date.now(); }
  function save() { L.saveState(storage, state); }
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("show"); }, 2300);
  }
  function renderKeep() { ui.keepScroll = true; render(); }
  function go(hash) {
    if (location.hash === hash) { render(); return; }
    location.hash = hash;        // hashchange pushes onto nav.stack
  }
  function dueLabel(iso) {
    var diff = new Date(iso).getTime() - now();
    if (diff <= 0) return "due now";
    var mins = Math.floor(diff / 60000);
    if (mins < 60) return "in " + mins + "m";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return "in " + hrs + "h";
    return "in " + Math.round(hrs / 24) + "d";
  }
  function timeAgo(iso) {
    var diff = now() - new Date(iso).getTime();
    if (diff < 60000) return "just now";
    var mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + "d ago";
    return new Date(iso).toLocaleDateString();
  }
  function isArmed(key) { return ui.armed && ui.armed.key === key && now() - ui.armed.at < 8000; }
  function dangerLabel(key, label) { return isArmed(key) ? "Confirm?" : label; }
  function armOrRun(key, fn) {
    if (isArmed(key)) { ui.armed = null; fn(); }
    else { ui.armed = { key: key, at: now() }; toast("Tap again to confirm"); renderKeep(); }
  }
  function formData(form) {
    var out = {};
    new FormData(form).forEach(function (v, k) { out[k] = typeof v === "string" ? v : String(v); });
    return out;
  }
  function parseRoute() {
    var raw = location.hash.replace(/^#\/?/, "");
    var q = raw.indexOf("?");
    var path = q === -1 ? raw : raw.slice(0, q);
    var query = q === -1 ? "" : raw.slice(q + 1);
    var parts = path.split("/").filter(Boolean);
    return { name: parts[0] || "guide", parts: parts, params: new URLSearchParams(query) };
  }
  function sortedNotes() {
    return state.notes.slice().sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }
  function toggleTheme() {
    L.setTheme(state, state.progress.theme === "dark" ? "light" : "dark");
    save();
    applyChrome();
    renderKeep();
  }

  /* --------------------------- native chrome --------------------------- */
  function capacitor() { return window.Capacitor || null; }
  function plugin(name) {
    var C = capacitor();
    if (!C) return null;
    try {
      if (C.Plugins && C.Plugins[name]) return C.Plugins[name];
      if (typeof C.registerPlugin === "function") return C.registerPlugin(name);
    } catch (e) { /* web preview / plugin not registered */ }
    return null;
  }
  function isNative() {
    var C = capacitor();
    return !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());
  }
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function applyChrome() {
    var dark = state.progress.theme === "dark";
    var bg = dark ? "#0c0c0e" : "#fafafa";
    document.documentElement.setAttribute("data-theme", state.progress.theme);
    if (themeMeta) themeMeta.setAttribute("content", bg);
    var SB = plugin("StatusBar");
    if (!SB) return;
    function quiet(p) { if (p && typeof p.catch === "function") p.catch(function () {}); }
    try {
      quiet(SB.setOverlaysWebView({ overlay: false }));
      quiet(SB.setBackgroundColor({ color: bg }));
      // "DARK" = light icons on a dark bar; "LIGHT" = dark icons on a light bar.
      quiet(SB.setStyle({ style: dark ? "DARK" : "LIGHT" }));
    } catch (e) { /* CSS safe-area padding is the fallback */ }
  }

  /* --------------------------- navigation stack ------------------------ */
  // The hardware back button must walk the screens the user actually opened,
  // Instagram-style, instead of closing the app on the first press.
  function currentHash() { return location.hash || "#/guide"; }
  function resetTransient() {
    ui.study = null; ui.selectedNode = null; ui.editCardId = null; ui.armed = null;
  }
  function updateBackButton() {
    var btn = document.getElementById("back-btn");
    if (btn) btn.hidden = nav.stack.length < 2;
  }
  function updateThemeButton() {
    var btn = document.getElementById("theme-btn");
    if (!btn) return;
    var dark = state.progress.theme === "dark";
    var icon = btn.querySelector(".theme-icon");
    var label = btn.querySelector(".theme-label");
    if (icon) icon.textContent = dark ? "☀" : "☾";
    if (label) label.textContent = dark ? "Light" : "Dark";
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  function navBack() {
    if (nav.stack.length < 2) return false;
    nav.stack.pop();
    var target = nav.stack[nav.stack.length - 1];
    resetTransient();
    if (location.hash === target) { render(); return true; }
    // The stack is already popped, so the resulting hashchange sees its new
    // top as a duplicate and does not push it back on.
    location.hash = target;
    render();
    return true;
  }
  function onHashChange() {
    var h = currentHash();
    var n = nav.stack.length;
    if (nav.stack[n - 1] === h) { render(); return; } // duplicate event
    if (n >= 2 && nav.stack[n - 2] === h) nav.stack.pop();
    else nav.stack.push(h);
    resetTransient();
    render();
  }

  /* ------------------------------- render ------------------------------ */
  function render() {
    var r = parseRoute();
    var y = window.scrollY;
    if (r.name === "guide" && r.params.get("step")) {
      ui.openSteps["step_" + Number(r.params.get("step"))] = true;
    }
    var html;
    switch (r.name) {
      case "guide": html = renderGuide(r); break;
      case "dashboard": html = renderDashboard(); break;
      case "decks": html = r.parts[1] ? renderDeck(r) : renderDecks(); break;
      case "study": html = renderStudy(r); break;
      case "maps": html = r.parts[1] ? renderMap(r) : renderMaps(); break;
      case "notes": html = renderNotes(); break;
      case "settings": html = renderSettings(); break;
      default: html = renderGuide(r);
    }
    view.innerHTML = html;
    var navName = r.name === "decks" || r.name === "study" ? "decks" : r.name;
    Array.prototype.forEach.call(document.querySelectorAll(".tabs a"), function (a) {
      a.classList.toggle("is-active", a.dataset.nav === navName);
    });
    if (ui.keepScroll) { window.scrollTo(0, y); ui.keepScroll = false; }
    else window.scrollTo(0, 0);
    afterRender(r);
  }

  function afterRender(r) {
    updateThemeButton();
    updateBackButton();
    if (r.name === "maps" && r.parts[1]) drawLines();
    if (r.name === "guide" && r.params.get("step")) {
      var el = document.getElementById("step-" + Number(r.params.get("step")));
      if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 70));
    }
  }

  /* ------------------------------- guide ------------------------------- */
  function renderGuide() {
    var done = state.progress.steps.length;
    var pct = Math.round((done / D.total) * 100);
    var out = [
      '<div class="page-head">',
      '<p class="eyebrow">Study system · works offline</p>',
      '<h1 class="h1">Learn like a learning scientist</h1>',
      '<p class="lede">Eight phases, forty-nine connected steps, and hands-on practice — all stored inside this app. No Wi-Fi, no login, no server.</p>',
      '</div>',
      '<div class="card progress-card">',
      '<div><b class="mono">' + done + " / " + D.total + '</b><div class="small muted">steps completed</div></div>',
      '<div class="progressbar"><span style="width:' + pct + '%"></span></div>',
      '<button class="btn btn-sm" data-action="toggle-theme">' + (state.progress.theme === "dark" ? "☀ Light mode" : "☾ Dark mode") + '</button>',
      '<button class="btn btn-sm" data-action="reset-progress">' + dangerLabel("reset-progress", "Reset progress") + '</button>',
      '</div>',
    ];

    D.phases.forEach(function (phase) {
      var steps = D.steps.filter(function (s) { return s.phase === phase.n; });
      out.push(
        '<section class="phase">',
        '<div class="phase-head"><span class="phase-num">PHASE ' + pad2(phase.n) + '</span>',
        '<h2 class="phase-name">' + esc(phase.keyword) + " · " + esc(phase.name) + '</h2>',
        '<span class="phase-goal">' + esc(phase.goal) + '</span></div>'
      );
      steps.forEach(function (s) {
        var n = stepNo(s.id);
        var checked = state.progress.steps.indexOf(s.id) !== -1;
        var open = !!ui.openSteps[s.id];
        out.push(
          '<div class="step" id="step-' + n + '">',
          '<div class="step-head" style="display:flex;gap:11px;align-items:flex-start;padding:12px 14px;cursor:pointer" data-action="toggle-open" data-id="' + esc(s.id) + '">',
          '<input class="step-check" type="checkbox" data-action="toggle-step" data-id="' + esc(s.id) + '"' + (checked ? " checked" : "") + ' aria-label="Mark step ' + n + ' complete">',
          '<span class="step-num">' + n + '</span>',
          '<div style="flex:1;min-width:0">',
          '<div class="step-title' + (checked ? " is-done" : "") + '">' + esc(s.emoji) + " " + esc(s.title) + '</div>',
          '<div class="step-desc">' + esc(s.description) + '</div></div>',
          '<span class="small muted">' + (open ? "▴" : "▾") + '</span></div>'
        );
        if (open) {
          out.push(
            '<div class="step-body">',
            '<p>' + esc(s.fullExplanation) + '</p>',
            '<div class="step-insight"><b>Insight.</b> ' + esc(s.insight) + '</div>',
            '<div class="related"><span class="small muted">Related:</span>',
            (s.related || []).map(function (rid) {
              return '<a href="#/guide?step=' + stepNo(rid) + '" data-action="open-step" data-step="' + stepNo(rid) + '">#' + stepNo(rid) + " " + esc(stepTitle(rid)) + '</a>';
            }).join(""),
            '</div></div>'
          );
        }
        out.push('</div>');
      });
      out.push('</section>');
    });

    out.push(renderGrinde(), renderDemo(), renderErrorAnalyser(), renderSir(), renderChecklist());
    out.push(
      '<div class="card card-pad" style="margin-top:26px">',
      '<h3>Ready to practise?</h3>',
      '<p class="small muted" style="margin-top:6px">Everything below is saved on this device too.</p>',
      '<div class="flex" style="margin-top:14px">',
      '<a class="btn btn-primary" href="#/maps">Open mind maps</a>',
      '<a class="btn" href="#/notes">Write notes</a>',
      '<a class="btn" href="#/decks">Review flashcards</a>',
      '</div></div>'
    );
    return out.join("");
  }

  function stepTitle(id) {
    var s = D.steps.find(function (x) { return x.id === id; });
    return s ? s.title : id;
  }

  function renderGrinde() {
    var item = GRINDE[ui.grinde];
    return [
      '<section class="card widget">',
      '<div class="widget-head"><p class="widget-label">Interactive · Phase 2</p>',
      '<h3>GRINDE Framework</h3>',
      '<p class="widget-sub">Six principles that turn a mind map from decoration into a thinking tool. Pick one.</p></div>',
      '<div class="pill-row">',
      GRINDE.map(function (g, i) {
        return '<button class="pill' + (i === ui.grinde ? " is-active" : "") + '" data-action="grinde" data-i="' + i + '"><b>' + g.key + '</b>' + g.name.slice(1) + '</button>';
      }).join(""),
      '</div>',
      '<div class="widget-grid">',
      '<div class="panel"><div class="flex"><span class="grinde-letter">' + item.key + '</span><div><h4>' + esc(item.name) + '</h4><p class="small muted" style="margin-top:6px">' + esc(item.desc) + '</p></div></div></div>',
      '<ul class="panel examples">',
      GRINDE.map(function (g, i) {
        return '<li class="' + (i === ui.grinde ? "is-on" : "") + '"><b>' + g.key + '</b><span>' + esc(g.example) + '</span></li>';
      }).join(""),
      '</ul></div></section>',
    ].join("");
  }

  function renderDemo() {
    if (!ui.demo) ui.demo = { queue: DEMO_CARDS.map(function (_, i) { return i; }), flipped: false, mastered: 0 };
    var d = ui.demo;
    var current = d.queue.length ? DEMO_CARDS[d.queue[0]] : null;
    return [
      '<section class="card widget">',
      '<div class="widget-head"><p class="widget-label">Demo · Phase 5</p>',
      '<h3>Flashcard practice</h3>',
      '<p class="widget-sub">Recall first, then flip. Honest ratings decide what comes back.</p></div>',
      current ? [
        '<div class="study-meta"><span>' + d.queue.length + ' / ' + DEMO_CARDS.length + ' due today</span><span>' + d.mastered + ' mastered</span></div>',
        '<div class="fc-card" style="margin-top:10px">',
        '<div class="fc-q">' + esc(current[0]) + '</div>',
        d.flipped ? '<div class="fc-a">' + esc(current[1]) + '</div>' : "",
        '</div>',
        '<div class="flex" style="margin-top:12px">',
        d.flipped
          ? '<button class="btn btn-primary" data-action="demo-answer" data-got="1">Got it</button><button class="btn" data-action="demo-answer" data-got="0">Needs review</button>'
          : '<button class="btn btn-primary" data-action="demo-flip">Show answer</button>',
        '<button class="btn btn-ghost btn-sm" data-action="demo-reset">Restart</button>',
        '</div>',
      ].join("") : '<div class="panel"><b>All demo cards mastered.</b><div class="small muted" style="margin-top:6px">Try the real flashcard decks for spaced repetition.</div><div class="flex" style="margin-top:12px"><a class="btn btn-primary" href="#/decks">Open decks</a><button class="btn btn-sm" data-action="demo-reset">Restart demo</button></div></div>',
      '</section>',
    ].join("");
  }

  function renderErrorAnalyser() {
    var item = ui.error == null ? null : ERRORS[ui.error];
    return [
      '<section class="card widget">',
      '<div class="widget-head"><p class="widget-label">Interactive · Phase 6</p>',
      '<h3>Practice-question analyser</h3>',
      '<p class="widget-sub">Got a question wrong? Choose the real cause to see the right fix.</p></div>',
      '<div class="error-options">',
      ERRORS.map(function (e, i) {
        return '<button class="' + (i === ui.error ? "is-active" : "") + '" data-action="error" data-i="' + i + '">' + esc(e.cause) + '</button>';
      }).join(""),
      '</div>',
      item ? '<div class="error-fix"><b>' + esc(item.fix) + '</b><p class="small" style="margin-top:6px">' + esc(item.detail) + '</p><a class="small" href="#/guide?step=' + item.step + '" data-action="open-step" data-step="' + item.step + '">Read step #' + item.step + ' →</a></div>' : "",
      '</section>',
    ].join("");
  }

  function renderSir() {
    return [
      '<section class="card widget">',
      '<div class="widget-head"><p class="widget-label">Review model · Phase 7</p>',
      '<h3>SIR — Spaced, Interleaved, Retrieval-based</h3>',
      '<p class="widget-sub">Tap a principle, then a point on the review timeline.</p></div>',
      '<div class="sir-grid">',
      SIR.map(function (s, i) {
        return '<div class="sir-card' + (i === ui.sir ? " is-active" : "") + '" data-action="sir" data-i="' + i + '"><b>' + s.key + '</b><h4>' + esc(s.name) + '</h4><p class="sir-def">' + esc(s.def) + '</p></div>';
      }).join(""),
      '</div>',
      '<div class="timeline" style="margin-top:16px">',
      TIMELINE.map(function (t, i) {
        return '<div class="timeline-item' + (i === ui.timeline ? " is-active" : "") + '" data-action="timeline" data-i="' + i + '"><b>Day ' + t.day + '</b>' + esc(t.what) + '</div>';
      }).join(""),
      '</div></section>',
    ].join("");
  }

  function renderChecklist() {
    var count = state.progress.checklist.length;
    return [
      '<section class="card widget">',
      '<div class="widget-head"><p class="widget-label">Checklist · Phase 8</p>',
      '<h3>Final exam readiness</h3>',
      '<p class="widget-sub">' + count + ' / ' + CHECKLIST.length + ' ready. Tick only what is genuinely true.</p></div>',
      CHECKLIST.map(function (c, i) {
        var on = state.progress.checklist.indexOf(i) !== -1;
        return '<label class="check-item"><input type="checkbox" data-action="toggle-check" data-index="' + i + '"' + (on ? " checked" : "") + '><span>' + esc(c) + '</span></label>';
      }).join(""),
      '</section>',
    ].join("");
  }

  /* ----------------------------- dashboard ----------------------------- */
  function renderDashboard() {
    var s = L.computeStats(state, now());
    var dueDecks = state.decks.filter(function (d) { return L.deckStats(state, d.id, now()).due > 0; });
    var out = [
      '<div class="page-head"><p class="eyebrow">Offline workspace</p><h1 class="h1">Home</h1>',
      '<p class="lede">Your study data lives on this device. Airplane mode is fine.</p></div>',
      '<div class="stat-grid">',
      stat("Due today", s.dueToday, true), stat("Day streak", s.streak), stat("Flashcards", s.totalCards),
      stat("Mind maps", s.maps), stat("Notes", s.notes), stat("Decks", s.decks),
      '</div>',
      '<h2 class="section-title">Get started</h2>',
      '<div class="grid grid-3">',
      '<a class="card deck-card" href="#/guide"><b>1. Read the system</b><p class="small muted" style="margin-top:6px">49 steps, GRINDE and the SIR review model.</p></a>',
      '<a class="card deck-card" href="#/maps"><b>2. Map a topic</b><p class="small muted" style="margin-top:6px">Drag nodes to show how ideas connect.</p></a>',
      '<a class="card deck-card" href="#/decks"><b>3. Review cards</b><p class="small muted" style="margin-top:6px">Leitner boxes schedule what comes back.</p></a>',
      '</div>',
    ];
    out.push('<h2 class="section-title">Due for review</h2>');
    out.push(dueDecks.length ? '<div class="list">' + dueDecks.map(function (d) {
      var st = L.deckStats(state, d.id, now());
      return '<div class="list-row"><span class="brand-dot" style="background:' + safeColor(d.color) + '"></span><div class="row-main"><div class="row-title">' + esc(d.title) + '</div><div class="row-sub">' + st.due + ' cards due · ' + st.total + ' total</div></div><a class="btn btn-sm btn-primary" href="#/study/' + d.id + '">Study</a></div>';
    }).join("") + '</div>' : '<div class="card empty">Nothing due. You are all caught up.</div>');
    out.push('<h2 class="section-title">Recent notes</h2>');
    var notes = sortedNotes().slice(0, 4);
    out.push(notes.length ? '<div class="list">' + notes.map(function (n) {
      return '<div class="list-row"><div class="row-main"><div class="row-title">' + (n.pinned ? "★ " : "") + esc(n.title || "Untitled note") + '</div><div class="row-sub">' + esc(n.subject) + '</div></div><span class="row-meta">' + timeAgo(n.updatedAt) + '</span></div>';
    }).join("") + '</div>' : '<div class="card empty">No notes yet.</div>');
    return out.join("");
  }
  function stat(label, value, accent) {
    return '<div class="card stat' + (accent ? " is-accent" : "") + '"><span class="small muted">' + esc(label) + '</span><b>' + value + '</b></div>';
  }

  /* ------------------------------- decks ------------------------------- */
  function renderDecks() {
    var out = [
      '<div class="page-head"><p class="eyebrow">Library</p><h1 class="h1">Flashcard decks</h1>',
      '<p class="lede">Each card climbs the Leitner boxes — the better you know it, the longer it stays away.</p></div>',
      '<form class="card inline-form" data-form="add-deck">',
      '<div class="form-row">',
      field("Deck title", '<input name="title" required maxlength="120" placeholder="e.g. Biology · Cell structure">'),
      field("Subject", '<input name="subject" maxlength="60" placeholder="General">'),
      field("Colour", '<input name="color" type="color" value="#5b5bd6">'),
      '</div>',
      '<div class="form-actions"><button class="btn btn-primary" type="submit">Create deck</button></div>',
      '</form>',
    ];
    if (!state.decks.length) return out.join("") + '<div class="card empty">No decks yet. Create your first one above.</div>';
    out.push('<div class="grid grid-3">');
    state.decks.slice().reverse().forEach(function (d) {
      var st = L.deckStats(state, d.id, now());
      out.push(
        '<a class="card deck-card" href="#/decks/' + d.id + '">',
        '<div class="flex"><span class="chip" style="background:' + safeColor(d.color) + '22;color:' + safeColor(d.color) + '">' + esc(d.subject) + '</span>',
        st.due ? '<span class="chip tag-due">' + st.due + ' due</span>' : "", '</div>',
        '<h3 style="margin-top:12px;font-size:19px">' + esc(d.title) + '</h3>',
        '<p class="small muted" style="margin-top:6px;min-height:38px">' + esc(d.description || "No description yet.") + '</p>',
        '<div class="bar"><span style="width:' + st.pct + '%;background:' + safeColor(d.color) + '"></span></div>',
        '<div class="flex small muted" style="margin-top:9px;justify-content:space-between"><span><b style="color:var(--ink)">' + st.total + '</b> cards</span><span><b style="color:var(--mint)">' + st.mastered + '</b> mastered</span><span>' + st.pct + '%</span></div>',
        '</a>'
      );
    });
    out.push('</div>');
    return out.join("");
  }

  function renderDeck(r) {
    var id = Number(r.parts[1]);
    var deck = state.decks.find(function (d) { return d.id === id; });
    if (!deck) return '<div class="card empty">Deck not found. <a href="#/decks">Back to decks</a></div>';
    var st = L.deckStats(state, id, now());
    var editing = ui.editCardId ? state.cards.find(function (c) { return c.id === ui.editCardId; }) : null;
    var out = [
      '<a class="back-link" href="#/decks" data-action="nav-back">← All decks</a>',
      '<div class="page-head flex" style="justify-content:space-between">',
      '<div><p class="eyebrow">' + esc(deck.subject) + '</p><h1 class="h1">' + esc(deck.title) + '</h1>',
      '<p class="lede">' + esc(deck.description || "No description yet.") + '</p></div>',
      '<div class="flex"><a class="btn btn-primary" href="#/study/' + id + '">Study now' + (st.due ? " (" + st.due + ")" : "") + '</a>',
      '<button class="btn btn-danger btn-sm" data-action="delete-deck" data-id="' + id + '">' + dangerLabel("delete-deck-" + id, "Delete deck") + '</button></div></div>',
      '<div class="stat-grid" style="margin-bottom:22px">',
      stat("Cards", st.total), stat("Due now", st.due, true), stat("Mastered", st.mastered), stat("Progress", st.pct + "%"),
      '</div>',
      '<form class="card inline-form" data-form="' + (editing ? "update-card" : "add-card") + '">',
      editing ? '<input type="hidden" name="id" value="' + editing.id + '">' : '<input type="hidden" name="deckId" value="' + id + '">',
      '<div class="form-row">',
      field("Front (question)", '<input name="front" required maxlength="1000" value="' + esc(editing ? editing.front : "") + '" placeholder="One specific question">'),
      field("Back (answer)", '<input name="back" required maxlength="2000" value="' + esc(editing ? editing.back : "") + '" placeholder="The smallest complete answer">'),
      '</div>',
      '<div class="form-actions"><button class="btn btn-primary" type="submit">' + (editing ? "Save card" : "Add card") + '</button>',
      editing ? '<button class="btn btn-sm" type="button" data-action="cancel-edit">Cancel</button>' : "",
      '</div></form>',
    ];
    var cards = state.cards.filter(function (c) { return c.deckId === id; });
    if (!cards.length) out.push('<div class="card empty">No cards yet. Add one above.</div>');
    else {
      out.push('<div class="list">');
      cards.slice().reverse().forEach(function (c) {
        out.push(
          '<div class="list-row"><div class="row-main"><div class="row-title">' + esc(c.front) + '</div>',
          '<div class="row-sub">' + esc(c.back) + '</div></div>',
          '<div class="row-meta"><span class="chip tag-box">' + (BOX_LABELS[L.clampBox(c.box)] || "Box " + c.box) + '</span> · ' + dueLabel(c.nextReviewAt) + '</div>',
          '<div class="row-actions"><button class="btn btn-sm" data-action="edit-card" data-id="' + c.id + '">Edit</button>',
          '<button class="btn btn-sm btn-danger" data-action="delete-card" data-id="' + c.id + '">' + dangerLabel("delete-card-" + c.id, "Delete") + '</button></div></div>'
        );
      });
      out.push('</div>');
    }
    return out.join("");
  }

  /* ------------------------------- study ------------------------------- */
  function renderStudy(r) {
    var deckId = Number(r.parts[1]);
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return '<div class="card empty">Deck not found. <a href="#/decks">Back to decks</a></div>';
    if (!ui.study || ui.study.deckId !== deckId) {
      ui.study = { deckId: deckId, queue: L.dueCards(state, deckId, now()).map(function (c) { return c.id; }), index: 0, flipped: false, counts: {} };
    }
    var s = ui.study;
    var head = [
      '<a class="back-link" href="#/decks/' + deckId + '" data-action="nav-back">← ' + esc(deck.title) + '</a>',
      '<div class="page-head"><p class="eyebrow">Study session</p><h1 class="h1">' + esc(deck.title) + '</h1></div>',
    ];
    if (!s.queue.length || s.index >= s.queue.length) {
      var done = Object.keys(s.counts).length;
      var all = state.cards.filter(function (c) { return c.deckId === deckId; });
      head.push(
        '<div class="card summary">',
        '<h3>' + (done ? "Session complete" : "Nothing due right now") + '</h3>',
        done ? '<div class="grid grid-2" style="margin:16px 0;text-align:left">' + L.RATINGS.map(function (rt) {
          return '<div class="card card-pad"><span class="small muted">' + RATING_META[rt].label + '</span><b style="font-size:22px">' + (s.counts[rt] || 0) + '</b></div>';
        }).join("") + '</div>' : '<p class="small muted" style="margin-top:8px">Come back later, or review every card now.</p>',
        '<div class="flex" style="justify-content:center;margin-top:14px">',
        all.length ? '<button class="btn btn-primary" data-action="study-all">Study all ' + all.length + ' cards</button>' : "",
        '<a class="btn" href="#/decks/' + deckId + '">Back to deck</a>',
        done ? '<button class="btn btn-sm" data-action="study-restart">Start again</button>' : "",
        '</div></div>'
      );
      return head.join("");
    }
    var card = state.cards.find(function (c) { return c.id === s.queue[s.index]; });
    if (!card) { s.index += 1; return renderStudy(r); }
    head.push(
      '<div class="study-meta"><span>' + (s.index + 1) + ' / ' + s.queue.length + '</span><span>Box ' + L.clampBox(card.box) + ' · ' + (BOX_LABELS[L.clampBox(card.box)] || "") + '</span></div>',
      '<div class="card study-card" style="margin-top:10px">',
      '<div class="study-front">' + esc(card.front) + '</div>',
      s.flipped ? '<div class="study-back">' + esc(card.back) + '</div>' : "",
      '</div>',
      '<div style="margin-top:14px">',
      s.flipped
        ? '<div class="rating-row">' + L.RATINGS.map(function (rt) {
            return '<button class="btn" data-action="rate" data-rating="' + rt + '">' + RATING_META[rt].label + '<small>' + RATING_META[rt].hint + '</small></button>';
          }).join("") + '</div>'
        : '<button class="btn btn-primary" data-action="flip" style="width:100%">Show answer</button>',
      '</div>',
      '<p class="small muted" style="margin-top:14px">Ratings are saved immediately — you can close the app mid-session.</p>'
    );
    return head.join("");
  }

  /* -------------------------------- maps ------------------------------- */
  function renderMaps() {
    var out = [
      '<div class="page-head"><p class="eyebrow">Workspace</p><h1 class="h1">Mind maps</h1>',
      '<p class="lede">Place ideas by their relationships, not in reading order. Drag nodes to reshape the map.</p></div>',
      '<form class="card inline-form" data-form="add-map">',
      '<div class="form-row">',
      field("Map title", '<input name="title" required maxlength="120" placeholder="e.g. Photosynthesis">'),
      field("Subject", '<input name="subject" maxlength="60" placeholder="General">'),
      '</div><div class="form-actions"><button class="btn btn-primary" type="submit">Create map</button></div></form>',
    ];
    if (!state.maps.length) return out.join("") + '<div class="card empty">No maps yet.</div>';
    out.push('<div class="list">');
    state.maps.slice().reverse().forEach(function (m) {
      var n = state.nodes.filter(function (x) { return x.mapId === m.id; }).length;
      out.push('<div class="list-row"><div class="row-main"><div class="row-title">' + esc(m.title) + '</div><div class="row-sub">' + esc(m.subject) + ' · ' + n + ' nodes · ' + timeAgo(m.updatedAt) + '</div></div><a class="btn btn-sm btn-primary" href="#/maps/' + m.id + '">Open</a><button class="btn btn-sm btn-danger" data-action="delete-map" data-id="' + m.id + '">' + dangerLabel("delete-map-" + m.id, "Delete") + '</button></div>');
    });
    out.push('</div>');
    return out.join("");
  }

  function renderMap(r) {
    var id = Number(r.parts[1]);
    var map = state.maps.find(function (m) { return m.id === id; });
    if (!map) return '<div class="card empty">Map not found. <a href="#/maps">Back to maps</a></div>';
    var nodes = state.nodes.filter(function (n) { return n.mapId === id; });
    var selected = nodes.find(function (n) { return n.id === ui.selectedNode; }) || null;
    var options = nodes.map(function (n) { return '<option value="' + n.id + '">' + esc(n.label) + '</option>'; }).join("");
    var out = [
      '<a class="back-link" href="#/maps" data-action="nav-back">← All maps</a>',
      '<div class="page-head flex" style="justify-content:space-between"><div><p class="eyebrow">' + esc(map.subject) + '</p><h1 class="h1">' + esc(map.title) + '</h1></div>',
      '<span class="chip">' + nodes.length + ' nodes</span></div>',
      '<div class="map-canvas" id="map-canvas">',
      '<svg class="map-lines" id="map-lines" aria-hidden="true"></svg>',
      nodes.map(function (n) {
        return '<div class="map-node' + (n.parentId == null ? " is-root" : "") + (selected && selected.id === n.id ? " is-selected" : "") + '" data-node-id="' + n.id + '" style="left:' + (Number(n.x) * 100).toFixed(3) + '%;top:' + (Number(n.y) * 100).toFixed(3) + '%;background:' + safeColor(n.color) + '">' + esc(n.label) + '</div>';
      }).join(""),
      '</div>',
      '<p class="map-hint">Drag a node to move it. Tap a node to edit its label, colour and parent. Positions save automatically.</p>',
      '<div class="grid grid-2 map-toolbar">',
      '<form class="card inline-form" data-form="add-node" style="margin:0">',
      '<input type="hidden" name="mapId" value="' + id + '">',
      '<h3>Add a node</h3>',
      '<div class="form-row" style="margin-top:10px">',
      field("Label", '<input name="label" required maxlength="120" placeholder="New idea">'),
      field("Parent", '<select name="parentId"><option value="">No parent (root)</option>' + options + '</select>'),
      field("Colour", '<input name="color" type="color" value="#5b5bd6">'),
      '</div><div class="form-actions"><button class="btn btn-primary" type="submit">Add node</button></div></form>',
      selected ? [
        '<form class="card inline-form" data-form="update-node" style="margin:0">',
        '<input type="hidden" name="id" value="' + selected.id + '">',
        '<h3>Edit node</h3>',
        '<div class="form-row" style="margin-top:10px">',
        field("Label", '<input name="label" required maxlength="120" value="' + esc(selected.label) + '">'),
        field("Parent", '<select name="parentId"><option value="">No parent (root)</option>' + nodes.filter(function (n) { return n.id !== selected.id; }).map(function (n) { return '<option value="' + n.id + '"' + (selected.parentId === n.id ? " selected" : "") + '>' + esc(n.label) + '</option>'; }).join("") + '</select>'),
        field("Colour", '<input name="color" type="color" value="' + safeColor(selected.color) + '">'),
        '</div><div class="form-actions"><button class="btn btn-primary" type="submit">Save</button>',
        '<button class="btn btn-sm btn-danger" type="button" data-action="delete-node" data-id="' + selected.id + '">' + dangerLabel("delete-node-" + selected.id, "Delete node") + '</button>',
        '<button class="btn btn-sm" type="button" data-action="deselect-node">Close</button></div></form>',
      ].join("") : '<div class="card empty">Tap a node on the map to edit it.</div>',
      '</div>',
    ];
    return out.join("");
  }

  function drawLines() {
    var canvas = document.getElementById("map-canvas");
    var svg = document.getElementById("map-lines");
    if (!canvas || !svg) return;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    svg.setAttribute("viewBox", "0 0 " + rect.width + " " + rect.height);
    var byId = {};
    state.nodes.forEach(function (n) { byId[n.id] = n; });
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var NS = "http://www.w3.org/2000/svg";
    state.nodes.forEach(function (n) {
      var p = n.parentId == null ? null : byId[n.parentId];
      if (!p || p.mapId !== n.mapId) return;
      var line = document.createElementNS(NS, "line");
      line.setAttribute("x1", (Number(p.x) * rect.width).toFixed(1));
      line.setAttribute("y1", (Number(p.y) * rect.height).toFixed(1));
      line.setAttribute("x2", (Number(n.x) * rect.width).toFixed(1));
      line.setAttribute("y2", (Number(n.y) * rect.height).toFixed(1));
      svg.appendChild(line);
    });
  }

  /* -------------------------------- notes ------------------------------ */
  function renderNotes() {
    var notes = sortedNotes();
    if (!ui.noteId || !notes.some(function (n) { return n.id === ui.noteId; })) {
      ui.noteId = notes.length ? notes[0].id : null;
    }
    var note = notes.find(function (n) { return n.id === ui.noteId; }) || null;
    var out = [
      '<div class="page-head flex" style="justify-content:space-between"><div><p class="eyebrow">Workspace</p><h1 class="h1">Notes</h1>',
      '<p class="lede">Write explanations in your own words and link them to concepts.</p></div>',
      '<button class="btn btn-primary" data-action="new-note">+ New note</button></div>',
      '<div class="note-layout">',
      '<div class="card note-list">',
      notes.length ? '<div class="list" style="border:0">' + notes.map(function (n) {
        return '<div class="list-row' + (note && note.id === n.id ? " is-active" : "") + '" data-action="select-note" data-id="' + n.id + '"><div class="row-main"><div class="row-title">' + (n.pinned ? "★ " : "") + esc(n.title || "Untitled note") + '</div><div class="row-sub">' + esc(n.subject) + ' · ' + timeAgo(n.updatedAt) + '</div></div></div>';
      }).join("") + '</div>' : '<div class="empty">No notes yet.</div>',
      '</div>',
    ];
    if (!note) {
      out.push('<div class="card empty">Create a note to start writing.</div></div>');
      return out.join("");
    }
    out.push(
      '<form class="card card-pad note-editor" data-form="save-note">',
      '<input type="hidden" name="id" value="' + note.id + '">',
      '<div class="form-row">',
      field("Title", '<input name="title" maxlength="160" value="' + esc(note.title) + '">'),
      field("Subject", '<input name="subject" maxlength="60" value="' + esc(note.subject) + '">'),
      '</div>',
      '<div class="field" style="margin-top:12px"><label>Content</label><textarea name="content">' + esc(note.content) + '</textarea></div>',
      '<label class="check-item" style="margin-top:8px;border:0"><input type="checkbox" name="pinned"' + (note.pinned ? " checked" : "") + '><span>Pin this note</span></label>',
      '<div class="form-actions"><button class="btn btn-primary" type="submit">Save note</button>',
      '<button class="btn btn-danger btn-sm" type="button" data-action="delete-note" data-id="' + note.id + '">' + dangerLabel("delete-note-" + note.id, "Delete") + '</button></div>',
      '</form></div>'
    );
    return out.join("");
  }

  /* ------------------------------ settings ----------------------------- */
  function renderSettings() {
    var s = L.computeStats(state, now());
    var json = L.exportJSON(state);
    return [
      '<div class="page-head"><p class="eyebrow">More</p><h1 class="h1">Settings &amp; backup</h1>',
      '<p class="lede">This app is fully offline. Nothing is uploaded anywhere.</p></div>',
      '<div class="card card-pad">',
      '<h3>Works without internet</h3>',
      '<ul style="margin-top:10px" class="small muted">',
      '<li>• All 49 study steps, GRINDE, SIR and exam checklist are bundled in the APK.</li>',
      '<li>• Mind maps, notes, flashcards and review history are saved on this device.</li>',
      '<li>• No account, no database, no fonts or scripts loaded from the network.</li>',
      '<li>• A separate online APK connects to the hosted web app — that one needs data or Wi-Fi.</li>',
      '</ul>',
      '<div class="flex" style="margin-top:14px"><button class="btn" data-action="toggle-theme">Switch to ' + (state.progress.theme === "dark" ? "light" : "dark") + ' theme</button></div>',
      '</div>',
      '<div class="stat-grid" style="margin-top:14px">',
      stat("Decks", s.decks), stat("Cards", s.totalCards), stat("Maps", s.maps), stat("Nodes", state.nodes.length), stat("Notes", s.notes), stat("Reviews", state.reviews.length),
      '</div>',
      '<h2 class="section-title">Export backup</h2>',
      '<div class="card card-pad">',
      '<p class="small muted">Copy this JSON and keep it somewhere safe. It contains all of your decks, maps, notes and progress.</p>',
      '<textarea id="export-json" readonly style="min-height:150px;margin-top:10px;font-family:ui-monospace,monospace;font-size:12px">' + esc(json) + '</textarea>',
      '<div class="form-actions"><button class="btn btn-primary" data-action="copy-backup">Copy backup</button>',
      '<button class="btn" data-action="download-backup">Download file</button></div></div>',
      '<h2 class="section-title">Import backup</h2>',
      '<div class="card card-pad">',
      '<form data-form="import-backup">',
      '<div class="field"><label>Paste a StudyX backup</label><textarea name="json" required placeholder="{ ... }" style="font-family:ui-monospace,monospace;font-size:12px"></textarea></div>',
      '<div class="form-actions"><button class="btn btn-primary" type="submit">' + dangerLabel("import-backup", "Load backup") + '</button></div></form></div>',
      '<h2 class="section-title">Reset</h2>',
      '<div class="card card-pad"><p class="small muted">Restores the starter deck, sample map and welcome note. Export first if you want to keep your work.</p>',
      '<div class="form-actions"><button class="btn btn-danger" data-action="reset-data">' + dangerLabel("reset-data", "Reset all data") + '</button></div></div>',
    ].join("");
  }

  /* ------------------------------ form/field --------------------------- */
  function field(label, control) {
    return '<div class="field"><label>' + esc(label) + '</label>' + control + '</div>';
  }

  /* ------------------------------ interaction -------------------------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
    var el = t.closest("[data-action]");
    if (!el) return;
    var a = el.dataset.action;
    var id;
    e.preventDefault();
    switch (a) {
      case "toggle-theme": toggleTheme(); break;
      case "nav-back": navBack(); break;
      case "toggle-open":
        ui.openSteps[el.dataset.id] = !ui.openSteps[el.dataset.id];
        renderKeep();
        break;
      case "open-step":
        ui.openSteps["step_" + el.dataset.step] = true;
        var target = "#/guide?step=" + el.dataset.step;
        if (location.hash === target) render(); else location.hash = target;
        break;
      case "reset-progress":
        armOrRun("reset-progress", function () {
          state.progress.steps = []; state.progress.checklist = [];
          save(); toast("Progress reset"); renderKeep();
        });
        break;
      case "grinde": ui.grinde = Number(el.dataset.i); renderKeep(); break;
      case "error": ui.error = Number(el.dataset.i); renderKeep(); break;
      case "sir": ui.sir = Number(el.dataset.i); renderKeep(); break;
      case "timeline": ui.timeline = Number(el.dataset.i); renderKeep(); break;
      case "demo-flip": ui.demo.flipped = true; renderKeep(); break;
      case "demo-answer":
        var got = el.dataset.got === "1";
        var q = ui.demo.queue;
        if (got) { q.shift(); ui.demo.mastered += 1; }
        else q.push(q.shift());
        ui.demo.flipped = false;
        renderKeep();
        break;
      case "demo-reset":
        ui.demo = { queue: DEMO_CARDS.map(function (_, i) { return i; }), flipped: false, mastered: 0 };
        renderKeep();
        break;
      case "delete-deck":
        id = Number(el.dataset.id);
        armOrRun("delete-deck-" + id, function () {
          L.deleteDeck(state, id); save(); toast("Deck deleted"); go("#/decks");
        });
        break;
      case "edit-card": ui.editCardId = Number(el.dataset.id); renderKeep(); break;
      case "cancel-edit": ui.editCardId = null; renderKeep(); break;
      case "delete-card":
        id = Number(el.dataset.id);
        armOrRun("delete-card-" + id, function () {
          L.deleteCard(state, id); if (ui.editCardId === id) ui.editCardId = null;
          save(); toast("Card deleted"); renderKeep();
        });
        break;
      case "flip": ui.study.flipped = true; renderKeep(); break;
      case "rate":
        var rt = el.dataset.rating;
        var cardId = ui.study.queue[ui.study.index];
        L.rateCard(state, cardId, rt, now());
        ui.study.counts[rt] = (ui.study.counts[rt] || 0) + 1;
        ui.study.index += 1;
        ui.study.flipped = false;
        save(); renderKeep();
        break;
      case "study-all":
        ui.study.queue = state.cards.filter(function (c) { return c.deckId === ui.study.deckId; }).map(function (c) { return c.id; });
        ui.study.index = 0; ui.study.flipped = false; ui.study.counts = {};
        renderKeep();
        break;
      case "study-restart": ui.study = null; renderKeep(); break;
      case "delete-map":
        id = Number(el.dataset.id);
        armOrRun("delete-map-" + id, function () {
          L.deleteMap(state, id); save(); toast("Map deleted"); go("#/maps");
        });
        break;
      case "deselect-node": ui.selectedNode = null; renderKeep(); break;
      case "delete-node":
        id = Number(el.dataset.id);
        armOrRun("delete-node-" + id, function () {
          L.deleteNode(state, id); ui.selectedNode = null; save(); toast("Node deleted"); renderKeep();
        });
        break;
      case "select-note": ui.noteId = Number(el.dataset.id); renderKeep(); break;
      case "new-note":
        var n = L.addNote(state, { title: "Untitled note", subject: "General", content: "" }, now());
        ui.noteId = n.id; save(); renderKeep();
        break;
      case "delete-note":
        id = Number(el.dataset.id);
        armOrRun("delete-note-" + id, function () {
          L.deleteNote(state, id); ui.noteId = null; save(); toast("Note deleted"); renderKeep();
        });
        break;
      case "copy-backup":
        var ta = document.getElementById("export-json");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(ta.value).then(function () { toast("Backup copied"); }, function () { fallbackCopy(ta); });
        } else fallbackCopy(ta);
        break;
      case "download-backup":
        try {
          var blob = new Blob([document.getElementById("export-json").value], { type: "application/json" });
          var url = URL.createObjectURL(blob);
          var a2 = document.createElement("a");
          a2.href = url; a2.download = "StudyX-backup.json";
          document.body.appendChild(a2); a2.click(); a2.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
          toast("Backup file requested");
        } catch (err) { toast("Use Copy backup instead"); }
        break;
      case "reset-data":
        armOrRun("reset-data", function () {
          state = L.createInitialState(now());
          ui.noteId = null; ui.study = null; ui.selectedNode = null; ui.demo = null;
          save(); toast("All data reset"); go("#/dashboard");
        });
        break;
      default: break;
    }
  });

  function fallbackCopy(ta) {
    try { ta.focus(); ta.select(); document.execCommand("copy"); toast("Backup copied"); }
    catch (e) { toast("Select and copy the text manually"); }
  }

  document.addEventListener("change", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    switch (el.dataset.action) {
      case "toggle-step":
        L.toggleStep(state, el.dataset.id); save(); renderKeep(); break;
      case "toggle-check":
        L.toggleChecklist(state, Number(el.dataset.index)); save(); renderKeep(); break;
    }
  });

  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form.dataset.form) return;
    e.preventDefault();
    var d = formData(form);
    switch (form.dataset.form) {
      case "add-deck":
        var deck = L.addDeck(state, d, now());
        save(); toast("Deck created"); go("#/decks/" + deck.id);
        break;
      case "add-card":
        L.addCard(state, { deckId: Number(d.deckId), front: d.front, back: d.back }, now());
        save(); toast("Card added"); renderKeep();
        break;
      case "update-card":
        L.updateCard(state, Number(d.id), { front: d.front, back: d.back });
        ui.editCardId = null; save(); toast("Card saved"); renderKeep();
        break;
      case "add-map":
        var map = L.addMap(state, d, now());
        save(); toast("Map created"); go("#/maps/" + map.id);
        break;
      case "add-node":
        L.addNode(state, {
          mapId: Number(d.mapId), parentId: d.parentId ? Number(d.parentId) : null,
          label: d.label, color: d.color,
          x: 0.35 + Math.random() * 0.3, y: 0.35 + Math.random() * 0.3,
        }, now());
        save(); toast("Node added"); renderKeep();
        break;
      case "update-node":
        L.updateNode(state, Number(d.id), {
          label: d.label, color: d.color, parentId: d.parentId ? Number(d.parentId) : null,
        }, now());
        save(); toast("Node saved"); renderKeep();
        break;
      case "save-note":
        L.updateNote(state, Number(d.id), {
          title: d.title, subject: d.subject, content: d.content,
          pinned: !!form.querySelector('[name="pinned"]').checked,
        }, now());
        save(); toast("Note saved"); renderKeep();
        break;
      case "import-backup":
        // No re-render on the first tap: it would wipe the pasted JSON.
        if (isArmed("import-backup")) {
          ui.armed = null;
          try {
            state = L.importJSON(d.json, now());
            ui.noteId = null; ui.study = null; ui.selectedNode = null; ui.demo = null;
            save(); toast("Backup loaded"); go("#/dashboard");
          } catch (err) { toast(err.message || "Invalid backup"); }
        } else {
          ui.armed = { key: "import-backup", at: now() };
          toast("Tap Load backup again to confirm");
        }
        break;
    }
  });

  /* ---------------------------- node dragging -------------------------- */
  var drag = null;
  document.addEventListener("pointerdown", function (e) {
    var node = e.target.closest(".map-node");
    var canvas = document.getElementById("map-canvas");
    if (!node || !canvas) return;
    var n = state.nodes.find(function (x) { return x.id === Number(node.dataset.nodeId); });
    if (!n) return;
    ui.selectedNode = n.id;
    drag = { id: n.id, node: node, canvas: canvas, startX: e.clientX, startY: e.clientY, x0: Number(n.x), y0: Number(n.y), moved: false };
    try { node.setPointerCapture(e.pointerId); } catch (err) { /* WebView may not support capture */ }
    e.preventDefault();
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var rect = drag.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var dx = (e.clientX - drag.startX) / rect.width;
    var dy = (e.clientY - drag.startY) / rect.height;
    if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 4) drag.moved = true;
    var x = Math.min(0.95, Math.max(0.05, drag.x0 + dx));
    var y = Math.min(0.94, Math.max(0.06, drag.y0 + dy));
    drag.x = x; drag.y = y;
    drag.node.style.left = (x * 100).toFixed(3) + "%";
    drag.node.style.top = (y * 100).toFixed(3) + "%";
    drawLines();
  });
  window.addEventListener("pointerup", function () {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.moved) {
      L.updateNode(state, d.id, { x: d.x, y: d.y }, now());
      save();
    }
    renderKeep();
  });
  window.addEventListener("resize", function () {
    if (parseRoute().name === "maps") drawLines();
  });

  /* -------------------------------- boot ------------------------------- */
  applyChrome();
  if (!location.hash) location.hash = "#/guide";
  nav.stack = [currentHash()];
  window.addEventListener("hashchange", onHashChange);

  var AppPlugin = plugin("App");
  if (isNative() && AppPlugin && typeof AppPlugin.addListener === "function") {
    try {
      AppPlugin.addListener("backButton", function () {
        if (navBack()) return;
        var t = now();
        if (t - nav.lastExitPress < 2000) {
          if (typeof AppPlugin.exitApp === "function") AppPlugin.exitApp();
          else window.history.back();
        } else {
          nav.lastExitPress = t;
          toast("Press back again to exit");
        }
      });
    } catch (e) { /* fall back to the WebView's own history */ }
  }
  render();
})();

/* Mindloom offline data layer — pure logic, no DOM, no network.
 * Works in a browser (window.MindloomLogic) and in Node (module.exports) so it
 * can be unit-tested without a WebView. All data lives in localStorage. */
(function (root) {
  "use strict";

  var KEY = "mindloom.offline.v1";
  var THEME_KEY = "ml.theme";
  var MINUTES_BY_BOX = { 1: 10, 2: 1440, 3: 4320, 4: 10080, 5: 23040 };
  var RATINGS = ["again", "hard", "good", "easy"];

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function iso(now) {
    return new Date(now).toISOString();
  }

  function clampBox(box) {
    var n = Math.round(Number(box) || 1);
    return Math.min(5, Math.max(1, n));
  }

  function nextBox(box, rating) {
    var b = clampBox(box);
    if (rating === "again") return 1;
    if (rating === "hard") return Math.max(1, b - 1);
    if (rating === "good") return Math.min(5, b + 1);
    if (rating === "easy") return Math.min(5, b + 2);
    return b;
  }

  function nextReviewAt(box, rating, now) {
    var minutes = MINUTES_BY_BOX[nextBox(box, rating)];
    return iso(now + minutes * 60 * 1000);
  }

  function clampFraction(value, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.round(Math.min(0.98, Math.max(0.02, n)) * 10000) / 10000;
  }

  function nextId(state, key) {
    var list = state[key] || [];
    var max = 0;
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].id) > max) max = Number(list[i].id);
    }
    return max + 1;
  }

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

  var GRINDE_NODES = [
    ["Grouped", 0], ["Relational", 1], ["Interconnected", 2],
    ["Non-verbal", 3], ["Directional", 4], ["Emphasized", 5],
  ];

  function createInitialState(now) {
    var t = iso(now);
    var state = {
      version: 1,
      decks: [{
        id: 1, title: "Study system essentials", subject: "Learning science",
        description: "Ten starter cards from the built-in flashcard demo.",
        color: "#5b5bd6", createdAt: t,
      }],
      cards: DEMO_CARDS.map(function (pair, i) {
        return {
          id: i + 1, deckId: 1, front: pair[0], back: pair[1], box: 1,
          lastReviewedAt: null, nextReviewAt: t, createdAt: t,
        };
      }),
      reviews: [],
      maps: [{ id: 1, title: "GRINDE mind map", subject: "Learning science", createdAt: t, updatedAt: t }],
      // Node coordinates are fractions of the canvas (0..1) so the same map
      // looks right on any phone screen without recalculating pixels.
      nodes: [{
        id: 1, mapId: 1, parentId: null, label: "Mind maps", x: 0.5, y: 0.5, color: "#5b5bd6",
      }].concat(GRINDE_NODES.map(function (g, i) {
        var angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        return {
          id: i + 2, mapId: 1, parentId: 1, label: g[0],
          x: Math.round((0.5 + 0.32 * Math.cos(angle)) * 10000) / 10000,
          y: Math.round((0.5 + 0.3 * Math.sin(angle)) * 10000) / 10000,
          color: ["#5b5bd6", "#12a372", "#e3a33f", "#e05a6b", "#3b82f6", "#8b5cf6"][i],
        };
      })),
      links: [],
      notes: [{
        id: 1, title: "Welcome — this app works offline",
        content: "Everything you see here is stored inside the APK. No account, no Wi-Fi and no mobile data needed.\n\nUse the Guide to read all 49 study steps, make mind maps on Maps, write notes on Notes, and review flashcards with spaced repetition on Flashcards. Your progress is saved on this device in Settings → Export backup.",
        subject: "Getting started", pinned: true, createdAt: t, updatedAt: t,
      }],
      progress: { steps: [], checklist: [], theme: "light" },
    };
    return state;
  }

  function normalize(raw, now) {
    if (!raw || typeof raw !== "object") return createInitialState(now);
    var base = createInitialState(now);
    var keys = ["decks", "cards", "reviews", "maps", "nodes", "links", "notes"];
    var out = { version: 1 };
    keys.forEach(function (k) {
      out[k] = Array.isArray(raw[k]) ? raw[k].filter(function (r) { return r && typeof r === "object"; }) : base[k];
    });
    var p = raw.progress || {};
    out.progress = {
      steps: Array.isArray(p.steps) ? p.steps.slice() : [],
      checklist: Array.isArray(p.checklist) ? p.checklist.slice() : [],
      theme: p.theme === "dark" ? "dark" : "light",
    };
    return out;
  }

  function loadState(storage, now) {
    try {
      var raw = storage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw), now);
    } catch (e) { /* corrupt data: start fresh rather than crash the WebView */ }
    return createInitialState(now);
  }

  function saveState(storage, state) {
    storage.setItem(KEY, JSON.stringify(state));
    try { storage.setItem(THEME_KEY, state.progress.theme); } catch (e) { /* ignore */ }
    return state;
  }

  /* ---------------------------- studies ---------------------------- */

  function deckStats(state, deckId, now) {
    var cards = state.cards.filter(function (c) { return c.deckId === deckId; });
    var due = cards.filter(function (c) { return new Date(c.nextReviewAt).getTime() <= now; }).length;
    var mastered = cards.filter(function (c) { return clampBox(c.box) >= 4; }).length;
    return {
      total: cards.length, due: due, mastered: mastered,
      pct: cards.length ? Math.round((mastered / cards.length) * 100) : 0,
    };
  }

  function dueCards(state, deckId, now) {
    return state.cards
      .filter(function (c) {
        return c.deckId === deckId && new Date(c.nextReviewAt).getTime() <= now;
      })
      .sort(function (a, b) { return new Date(a.nextReviewAt) - new Date(b.nextReviewAt); })
      .slice(0, 100);
  }

  function rateCard(state, cardId, rating, now) {
    if (RATINGS.indexOf(rating) === -1) return null;
    var card = state.cards.find(function (c) { return c.id === cardId; });
    if (!card) return null;
    card.box = nextBox(card.box, rating);
    card.lastReviewedAt = iso(now);
    card.nextReviewAt = nextReviewAt(card.box, rating, now);
    state.reviews.push({
      id: nextId(state, "reviews"), cardId: card.id, rating: rating, reviewedAt: iso(now),
    });
    return card;
  }

  function computeStats(state, now) {
    var cards = state.cards;
    var due = cards.filter(function (c) { return new Date(c.nextReviewAt).getTime() <= now; }).length;
    var mastered = cards.filter(function (c) { return clampBox(c.box) >= 4; }).length;
    var days = {};
    state.reviews.forEach(function (r) {
      days[String(r.reviewedAt).slice(0, 10)] = true;
    });
    function fmt(d) {
      return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    }
    var cursor = new Date(now);
    if (!days[fmt(cursor)]) cursor.setDate(cursor.getDate() - 1);
    var streak = 0;
    while (days[fmt(cursor)]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return {
      dueToday: due, totalCards: cards.length, mastered: mastered,
      decks: state.decks.length, maps: state.maps.length, notes: state.notes.length,
      streak: streak, reviewedToday: days[fmt(new Date(now))] ? 1 : 0,
    };
  }

  /* ------------------------------ CRUD ----------------------------- */

  function addDeck(state, data, now) {
    var deck = {
      id: nextId(state, "decks"),
      title: String(data.title || "Untitled deck").slice(0, 120),
      subject: String(data.subject || "General").slice(0, 60),
      description: String(data.description || "").slice(0, 500),
      color: /^#[0-9a-f]{6}$/i.test(data.color || "") ? data.color : "#5b5bd6",
      createdAt: iso(now),
    };
    state.decks.push(deck);
    return deck;
  }

  function deleteDeck(state, id) {
    state.decks = state.decks.filter(function (d) { return d.id !== id; });
    var cardIds = state.cards.filter(function (c) { return c.deckId === id; }).map(function (c) { return c.id; });
    state.cards = state.cards.filter(function (c) { return c.deckId !== id; });
    state.reviews = state.reviews.filter(function (r) { return cardIds.indexOf(r.cardId) === -1; });
    state.links = state.links.filter(function (l) { return cardIds.indexOf(l.cardId) === -1; });
  }

  function addCard(state, data, now) {
    var card = {
      id: nextId(state, "cards"), deckId: Number(data.deckId),
      front: String(data.front || "").slice(0, 1000), back: String(data.back || "").slice(0, 2000),
      box: 1, lastReviewedAt: null, nextReviewAt: iso(now), createdAt: iso(now),
    };
    state.cards.push(card);
    return card;
  }

  function updateCard(state, id, data) {
    var card = state.cards.find(function (c) { return c.id === id; });
    if (!card) return null;
    if (data.front != null) card.front = String(data.front).slice(0, 1000);
    if (data.back != null) card.back = String(data.back).slice(0, 2000);
    return card;
  }

  function deleteCard(state, id) {
    state.cards = state.cards.filter(function (c) { return c.id !== id; });
    state.reviews = state.reviews.filter(function (r) { return r.cardId !== id; });
    state.links = state.links.filter(function (l) { return l.cardId !== id; });
  }

  function addMap(state, data, now) {
    var map = {
      id: nextId(state, "maps"), title: String(data.title || "Untitled map").slice(0, 120),
      subject: String(data.subject || "General").slice(0, 60),
      createdAt: iso(now), updatedAt: iso(now),
    };
    state.maps.push(map);
    return map;
  }

  function deleteMap(state, id) {
    state.maps = state.maps.filter(function (m) { return m.id !== id; });
    var nodeIds = state.nodes.filter(function (n) { return n.mapId === id; }).map(function (n) { return n.id; });
    state.nodes = state.nodes.filter(function (n) { return n.mapId !== id; });
    state.links = state.links.filter(function (l) { return nodeIds.indexOf(l.nodeId) === -1; });
  }

  function addNode(state, data, now) {
    var node = {
      id: nextId(state, "nodes"), mapId: Number(data.mapId),
      parentId: data.parentId ? Number(data.parentId) : null,
      label: String(data.label || "New idea").slice(0, 120),
      x: clampFraction(data.x, 0.5), y: clampFraction(data.y, 0.5),
      color: /^#[0-9a-f]{6}$/i.test(data.color || "") ? data.color : "#5b5bd6",
    };
    state.nodes.push(node);
    var map = state.maps.find(function (m) { return m.id === node.mapId; });
    if (map) map.updatedAt = iso(now);
    return node;
  }

  function updateNode(state, id, patch, now) {
    var node = state.nodes.find(function (n) { return n.id === id; });
    if (!node) return null;
    ["label", "color", "parentId"].forEach(function (k) {
      if (patch[k] !== undefined) node[k] = patch[k];
    });
    if (patch.x !== undefined) node.x = clampFraction(patch.x, node.x);
    if (patch.y !== undefined) node.y = clampFraction(patch.y, node.y);
    var map = state.maps.find(function (m) { return m.id === node.mapId; });
    if (map) map.updatedAt = iso(now);
    return node;
  }

  function deleteNode(state, id) {
    state.nodes = state.nodes.filter(function (n) { return n.id !== id && n.parentId !== id; });
    state.links = state.links.filter(function (l) { return l.nodeId !== id; });
  }

  function addNote(state, data, now) {
    var note = {
      id: nextId(state, "notes"), title: String(data.title || "Untitled note").slice(0, 160),
      content: String(data.content || ""), subject: String(data.subject || "General").slice(0, 60),
      pinned: false, createdAt: iso(now), updatedAt: iso(now),
    };
    state.notes.push(note);
    return note;
  }

  function updateNote(state, id, data, now) {
    var note = state.notes.find(function (n) { return n.id === id; });
    if (!note) return null;
    ["title", "content", "subject"].forEach(function (k) {
      if (data[k] !== undefined) note[k] = String(data[k]);
    });
    if (data.pinned !== undefined) note.pinned = Boolean(data.pinned);
    note.updatedAt = iso(now);
    return note;
  }

  function deleteNote(state, id) {
    state.notes = state.notes.filter(function (n) { return n.id !== id; });
    state.links = state.links.filter(function (l) { return l.noteId !== id; });
  }

  /* ---------------------------- progress --------------------------- */

  function toggleIn(list, value) {
    var i = list.indexOf(value);
    if (i === -1) list.push(value);
    else list.splice(i, 1);
    return list;
  }

  function toggleStep(state, id) { return toggleIn(state.progress.steps, id); }
  function toggleChecklist(state, index) { return toggleIn(state.progress.checklist, index); }
  function setTheme(state, theme) { state.progress.theme = theme === "dark" ? "dark" : "light"; return state; }

  function exportJSON(state) { return JSON.stringify(state, null, 2); }

  function importJSON(text, now) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.decks) || !Array.isArray(parsed.cards)) {
      throw new Error("That backup is not a Mindloom export.");
    }
    return normalize(parsed, now);
  }

  var api = {
    KEY: KEY, THEME_KEY: THEME_KEY, RATINGS: RATINGS,
    MINUTES_BY_BOX: MINUTES_BY_BOX,
    iso: iso, clampBox: clampBox, nextBox: nextBox, nextReviewAt: nextReviewAt,
    nextId: nextId, createInitialState: createInitialState, normalize: normalize,
    loadState: loadState, saveState: saveState,
    deckStats: deckStats, dueCards: dueCards, rateCard: rateCard, computeStats: computeStats,
    addDeck: addDeck, deleteDeck: deleteDeck, addCard: addCard, updateCard: updateCard, deleteCard: deleteCard,
    addMap: addMap, deleteMap: deleteMap, addNode: addNode, updateNode: updateNode, deleteNode: deleteNode,
    addNote: addNote, updateNote: updateNote, deleteNote: deleteNote,
    toggleStep: toggleStep, toggleChecklist: toggleChecklist, setTheme: setTheme,
    exportJSON: exportJSON, importJSON: importJSON,
  };

  root.MindloomLogic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

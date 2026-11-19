/* Verifies the offline bundle in CI: the data layer, the study content, and the
 * hard requirement that nothing in the APK's web assets can touch the network. */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const offline = join(root, "offline");
const read = (f) => readFileSync(join(offline, f), "utf8");

const files = readdirSync(offline).filter((f) => statSync(join(offline, f)).isFile()).sort();
const required = ["app.js", "data.js", "index.html", "logic.js", "manifest.json", "styles.css"];
required.forEach((f) => assert.ok(files.includes(f), `missing offline/${f}`));

/* ---------------------- no network in the web assets --------------------- */
const networkPatterns = [
  /\bfetch\s*\(/i,
  /XMLHttpRequest/i,
  /serviceWorker/i,
  /@import/i,
  /<script[^>]+src\s*=\s*["'](?!data\.js|logic\.js|app\.js)/i,
  /<link[^>]+href\s*=\s*["'](?:https?:)?\/\//i,
  /url\(\s*["']?https?:/i,
  /https?:\/\/(?!www\.w3\.org\/2000\/svg)/i,
];
for (const f of files) {
  const text = read(f);
  for (const re of networkPatterns) {
    assert.ok(!re.test(text), `offline/${f} contains a network reference: ${re}`);
  }
}
assert.match(read("index.html"), /<script src="data\.js"><\/script>/);
assert.match(read("index.html"), /<script src="logic\.js"><\/script>/);
assert.match(read("index.html"), /<script src="app\.js"><\/script>/);

/* Header is always visible below the status bar; theme control is discoverable. */
assert.match(read("index.html"), /id="back-btn"/);
assert.match(read("index.html"), /class="brand-name">StudyX</);
assert.match(read("index.html"), /data-action="toggle-theme"/);
assert.match(read("styles.css"), /safe-area-inset-top/);
assert.match(read("app.js"), /StatusBar/);
assert.match(read("app.js"), /backButton/);
assert.match(read("app.js"), /nav-back/);

/* Native side: WebView must be inset below the status bar, and the two plugins
 * that drive the status bar colours and the hardware back button must exist. */
const layout = readFileSync(join(root, "android/app/src/main/res/layout/activity_main.xml"), "utf8");
assert.match(layout, /android:fitsSystemWindows="true"/);
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.ok(pkg.dependencies["@capacitor/app"], "missing @capacitor/app (hardware back button)");
assert.ok(pkg.dependencies["@capacitor/status-bar"], "missing @capacitor/status-bar");

/* StudyX branding: visible app name, native launcher label and the renamed
 * APK folder/file. The old Mindloom storage key / logic API stays intact so an
 * upgrade keeps the user's notes, decks and progress. */
const offlineConfig = readFileSync(join(root, "capacitor.offline.config.ts"), "utf8");
assert.match(offlineConfig, /appName:\s*"StudyX"/);
assert.match(read("manifest.json"), /"short_name":\s*"StudyX"/);
const brandScript = readFileSync(join(root, "scripts/set-offline-brand.mjs"), "utf8");
assert.match(brandScript, /StudyX/);
const workflow = readFileSync(join(root, ".github/workflows/build-offline-apk.yml"), "utf8");
assert.match(workflow, /set-offline-brand\.mjs/);
assert.match(workflow, /StudyX\.apk/);
assert.ok(existsSync(join(root, "StudyX/StudyX.apk")), "renamed APK mirror missing");
assert.ok(!existsSync(join(root, "downloads/app-debug-offline.apk")), "old APK name still present");
assert.match(read("logic.js"), /mindloom\.offline\.v1/, "storage key must stay stable across the rename");

/* ------------------------- load scripts in a VM -------------------------- */
const sandbox = { window: {}, console, Date, Math, JSON, URLSearchParams, isFinite, parseInt, parseFloat };
vm.createContext(sandbox);
vm.runInContext(read("data.js"), sandbox, { filename: "data.js" });
vm.runInContext(read("logic.js"), sandbox, { filename: "logic.js" });
const D = sandbox.window.STUDY_DATA;
const L = sandbox.window.MindloomLogic;
assert.ok(D, "STUDY_DATA missing");
assert.ok(L, "MindloomLogic missing");

/* ------------------------------ content ---------------------------------- */
assert.equal(D.phases.length, 8, "expected 8 phases");
assert.equal(D.steps.length, 49, "expected 49 steps");
assert.equal(D.total, 49);
for (const s of D.steps) {
  assert.ok(s.fullExplanation && s.fullExplanation.length > 40, `step ${s.id} has no explanation`);
  assert.ok(s.insight, `step ${s.id} has no insight`);
  assert.ok(Array.isArray(s.related), `step ${s.id} has no related links`);
  assert.ok(s.phase >= 1 && s.phase <= 8, `step ${s.id} has a bad phase`);
}
const inOrder = D.steps.every((s, i) => Number(s.id.replace("step_", "")) === i + 1);
assert.ok(inOrder, "steps are not numbered 1..49");

/* ------------------------------- logic ----------------------------------- */
function makeStorage() {
  const m = Object.create(null);
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
}
const T = Date.parse("2026-11-19T10:00:00Z");
const store = makeStorage();
let state = L.createInitialState(T);
assert.equal(state.decks.length, 1);
assert.equal(state.cards.length, 10);
assert.equal(state.nodes.length, 7);
assert.equal(state.notes.length, 1);
state.nodes.forEach((n) => {
  assert.ok(n.x > 0 && n.x < 1 && n.y > 0 && n.y < 1, "node coordinates must be fractions");
});

L.saveState(store, state);
state = L.loadState(store, T);
assert.equal(state.cards.length, 10, "state did not round-trip through storage");

let st = L.deckStats(state, 1, T);
assert.equal(st.total, 10);
assert.equal(st.due, 10, "starter cards should be due immediately");
assert.equal(st.mastered, 0);

const card = L.rateCard(state, 1, "good", T);
assert.equal(card.box, 2);
assert.ok(new Date(card.nextReviewAt).getTime() > T);
assert.equal(state.reviews.length, 1);
L.rateCard(state, 1, "again", T);
assert.equal(card.box, 1, "Again must reset the box to 1");
assert.equal(state.reviews.length, 2);

const stats = L.computeStats(state, T);
assert.equal(stats.totalCards, 10);
assert.equal(stats.reviewedToday, 1);
assert.equal(stats.streak, 1);
assert.equal(stats.maps, 1);
assert.equal(stats.notes, 1);

const deck = L.addDeck(state, { title: "Test deck", color: "#123456" }, T);
assert.equal(deck.id, 2);
L.addCard(state, { deckId: deck.id, front: "Q", back: "A" }, T);
assert.equal(L.deckStats(state, deck.id, T).total, 1);
L.deleteDeck(state, deck.id);
assert.equal(state.cards.filter((c) => c.deckId === deck.id).length, 0, "deleteDeck must cascade");

const node = L.addNode(state, { mapId: 1, label: "Extra", x: 0.42, y: 0.61, parentId: 1 }, T);
assert.equal(node.x, 0.42, "fractional node x was mangled");
L.updateNode(state, node.id, { x: 0.7312, y: 0.2488, label: "Moved" }, T);
assert.equal(node.x, 0.7312, "fractional node x was rounded away");
assert.equal(node.label, "Moved");
assert.ok(node.x > 0 && node.x < 1);

const note = L.addNote(state, { title: "N", content: "C" }, T);
L.updateNote(state, note.id, { pinned: true, content: "C2" }, T);
assert.equal(note.pinned, true);
assert.equal(note.content, "C2");

L.toggleStep(state, "step_1");
L.toggleStep(state, "step_1");
assert.equal(state.progress.steps.length, 0, "toggleStep must toggle");
L.toggleStep(state, "step_2");
L.toggleChecklist(state, 3);
L.setTheme(state, "dark");
assert.equal(state.progress.steps[0], "step_2");
assert.equal(state.progress.checklist[0], 3);
assert.equal(state.progress.theme, "dark");

const json = L.exportJSON(state);
const imported = L.importJSON(json, T);
assert.equal(imported.decks.length, state.decks.length);
assert.equal(imported.progress.theme, "dark");
assert.throws(() => L.importJSON('{"nope":1}', T), /not a StudyX export/);
assert.throws(() => L.importJSON("not json", T));

const corrupt = makeStorage();
corrupt.setItem(L.KEY, "{ broken");
const recovered = L.loadState(corrupt, T);
assert.equal(recovered.cards.length, 10, "corrupt storage must fall back to a fresh state");

console.log("offline verification passed:", {
  files, phases: D.phases.length, steps: D.steps.length,
  starterCards: L.createInitialState(T).cards.length,
  bytes: required.reduce((n, f) => n + read(f).length, 0),
});

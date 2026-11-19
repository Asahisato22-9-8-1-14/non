/* Optional DOM smoke test. Run locally with jsdom installed; skipped in CI
 * (the APK build does not need a DOM library). */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

let JSDOM;
try {
  ({ JSDOM } = await import("jsdom"));
} catch {
  console.log("jsdom not installed — skipping DOM smoke test");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, "offline", f), "utf8");
const html = read("index.html");
const dom = new JSDOM(html, { url: "https://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;
window.scrollTo = () => {};
window.HTMLElement.prototype.setPointerCapture = function () {};
window.HTMLElement.prototype.releasePointerCapture = function () {};

window.eval(read("data.js"));
window.eval(read("logic.js"));
window.eval(read("app.js"));

function text() { return doc.getElementById("view").textContent; }
function html_() { return doc.getElementById("view").innerHTML; }
function click(sel) {
  const el = doc.querySelector(sel);
  assert.ok(el, `no element ${sel}`);
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}
function submit(sel, values) {
  const form = doc.querySelector(sel);
  assert.ok(form, `no form ${sel}`);
  Object.keys(values || {}).forEach((k) => {
    const input = form.querySelector('[name="' + k + '"]');
    if (input) input.value = values[k];
  });
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}
function go(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new window.Event("hashchange"));
}
function storage() { return JSON.parse(window.localStorage.getItem("mindloom.offline.v1")); }

/* Guide */
assert.match(text(), /Learn like a learning scientist/);
assert.equal(doc.querySelectorAll(".step").length, 49, "all 49 steps must render");
click('.step-head[data-id="step_1"]');
assert.match(html_(), /Before opening any material/, "step detail should expand");
const cb = doc.querySelector('.step-check[data-id="step_1"]');
cb.checked = true;
cb.dispatchEvent(new window.Event("change", { bubbles: true }));
assert.ok(storage().progress.steps.includes("step_1"), "step progress must persist");
click('[data-action="grinde"][data-i="3"]');
assert.match(text(), /Non-verbal/);

/* Decks */
go("#/decks");
assert.match(text(), /Flashcard decks/);
assert.match(text(), /Study system essentials/);
submit('[data-form="add-deck"]', { title: "DOM test deck", subject: "Testing" });
go("#/decks/2");
assert.match(text(), /DOM test deck/);
submit('[data-form="add-card"]', { front: "What is 2+2?", back: "4" });
assert.match(text(), /What is 2\+2\?/);
assert.equal(storage().cards.filter((c) => c.deckId === 2).length, 1);

/* Study session with spaced repetition */
go("#/study/1");
assert.match(text(), /Show answer/);
click('[data-action="flip"]');
assert.match(text(), /Show answer|Got it|Again/);
click('[data-action="rate"][data-rating="good"]');
assert.equal(storage().reviews.length, 1, "rating must write a review");
assert.equal(storage().cards.find((c) => c.id === 1).box, 2, "Good must advance the box");

/* Maps */
go("#/maps/1");
assert.equal(doc.querySelectorAll(".map-node").length, 7, "sample mind map should render");
assert.match(text(), /Add a node/);
submit('[data-form="add-node"]', { label: "DOM node", color: "#12a372" });
assert.equal(doc.querySelectorAll(".map-node").length, 8);
const newNode = storage().nodes.find((n) => n.label === "DOM node");
assert.ok(newNode.x > 0 && newNode.x < 1, "new node must have fractional coordinates");

/* Notes */
go("#/notes");
assert.match(text(), /Welcome — this app works offline/);
submit('[data-form="save-note"]', { title: "Edited offline", content: "No network needed." });
assert.equal(storage().notes.find((n) => n.id === 1).title, "Edited offline");

/* Settings + theme */
go("#/settings");
assert.match(text(), /Works without internet/);
assert.ok(doc.getElementById("export-json").value.includes("Edited offline"));
click("#theme-btn");
assert.equal(doc.documentElement.getAttribute("data-theme"), "dark");
assert.equal(window.localStorage.getItem("ml.theme"), "dark");
click("#theme-btn");
assert.equal(doc.documentElement.getAttribute("data-theme"), "light");

/* Dashboard */
go("#/dashboard");
assert.match(text(), /Offline workspace/);
assert.match(text(), /Due today/);

/* Header: brand, labelled theme switch, back button */
assert.equal(doc.querySelector(".brand-name").textContent, "StudyX");
assert.ok(doc.querySelector("#theme-btn .theme-label").textContent.length > 0);
assert.equal(doc.getElementById("toast").textContent !== undefined, true);

/* Back navigation walks the visited screens (Instagram-style) instead of
   closing the app on the first press. First unwind everything visited above. */
var guard = 0;
while (!doc.getElementById("back-btn").hidden && guard++ < 25) {
  click('[data-action="nav-back"]');
}
assert.equal(doc.getElementById("back-btn").hidden, true, "no back button at root");
go("#/decks");
assert.equal(doc.getElementById("back-btn").hidden, false, "back button appears after navigating");
go("#/decks/1");
assert.match(text(), /Study system essentials/);
click('[data-action="nav-back"]');
assert.match(text(), /Flashcard decks/, "back returns to the deck list");
assert.equal(doc.getElementById("back-btn").hidden, false);
click('[data-action="nav-back"]');
assert.match(text(), /Learn like a learning scientist/, "second back returns to the guide");
assert.equal(doc.getElementById("back-btn").hidden, true, "root has no back button again");

console.log("offline DOM smoke test passed");

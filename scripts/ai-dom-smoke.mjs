/* DOM smoke test for the AI flavour. Run locally with jsdom installed:
 *   npm ci --legacy-peer-deps && npm i --no-save jsdom && npm run ai:smoke
 *
 * It exercises the real screen flow with a stubbed network layer, so a broken
 * form, cap or provider switch fails here instead of in the APK.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

let JSDOM;
try {
  ({ JSDOM } = await import("jsdom"));
} catch {
  console.log("jsdom not installed — skipping AI DOM smoke test");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readAi = (f) => readFileSync(join(root, "offline-ai", f), "utf8");
const dom = new JSDOM(readAi("index.html"), {
  url: "https://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const { window } = dom;
const doc = window.document;
window.scrollTo = () => {};
window.HTMLElement.prototype.setPointerCapture = function () {};
window.HTMLElement.prototype.releasePointerCapture = function () {};

/* ------------------------------ fake provider ---------------------------- */
const calls = [];
window.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push({ url, model: body.model, auth: init.headers.Authorization, messages: body.messages });
  return {
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        model: body.model,
        choices: [{ message: { content: "Stub reply for: " + body.messages[body.messages.length - 1].content } }],
      }),
  };
};

window.eval(readAi("data.js"));
window.eval(readAi("logic.js"));
window.eval(readAi("app.js"));
window.eval(readAi("ai.js"));

const text = () => doc.getElementById("view").textContent;
const markup = () => doc.getElementById("view").innerHTML;
function click(sel) {
  const el = doc.querySelector(sel);
  assert.ok(el, `no element ${sel}`);
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}
function change(sel, value) {
  const el = doc.querySelector(sel);
  assert.ok(el, `no element ${sel}`);
  el.value = value;
  el.dispatchEvent(new window.Event("change", { bubbles: true }));
}
function submit(sel, values) {
  const form = doc.querySelector(sel);
  assert.ok(form, `no form ${sel}`);
  Object.keys(values).forEach((k) => {
    const input = form.querySelector('[name="' + k + '"]');
    if (input) input.value = values[k];
  });
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}
function go(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new window.Event("hashchange"));
}
const keys = () => JSON.parse(window.localStorage.getItem("ml.ai.v1") || "null");
const settle = () => new Promise((r) => setTimeout(r, 0));

/* ------------------------------- the chat tab --------------------------- */
const tab = doc.querySelector('.tabs a[data-nav="chat"]');
assert.ok(tab, "AI build must show the AI Chat tab");
assert.equal(tab.hidden, false, "AI tab should be visible in the AI build");

go("#/chat");
assert.match(text(), /Connect 1 to 5 providers/, "chat must prompt for a key first");
assert.match(text(), /Everything else in StudyX keeps working offline/);

/* --------------------------- add a first provider ------------------------ */
click('[data-action="ai-add"]');
submit('form[data-form="ai-save"]', {
  provider: "groq",
  label: "My Groq",
  apiKey: "gsk_test_key_1234567890",
  model: "llama-3.3-70b-versatile",
  baseUrl: "https://api.groq.com/openai/v1",
});
let saved = keys();
assert.ok(saved, "key must be stored");
assert.equal(saved.connections.length, 1);
assert.equal(saved.connections[0].provider, "groq");
assert.equal(saved.activeId, saved.connections[0].id);

/* Chat unlocks and an existing conversation starts empty. */
click('[data-action="ai-tab"][data-tab="chat"]');
assert.match(text(), /Ask StudyX/, "chat composer should appear once a key exists");
assert.match(text(), /key gsk_t••••7890/, "the key must be shown masked only");

/* ------------------------------- send a message -------------------------- */
submit('form[data-form="ai-send"]', { message: "What is active recall?" });
await settle();
assert.equal(calls.length, 1, "one provider call expected");
assert.match(calls[0].url, /^https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions$/);
assert.equal(calls[0].auth, "Bearer gsk_test_key_1234567890");
assert.equal(calls[0].messages[0].role, "system");
assert.match(text(), /What is active recall\?/);
assert.match(text(), /Stub reply for: What is active recall\?/, "reply must render");
assert.ok(
  /ml\.ai\.chat\.v1/.test(Object.keys(window.localStorage).join(" ")),
  "transcript should be saved",
);

/* ------------------------------- more providers -------------------------- */
const extras = [
  ["openai", "https://api.openai.com/v1", "sk-test-openai-123456"],
  ["gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "AIzaTestGemini123456"],
  ["openrouter", "https://openrouter.ai/api/v1", "sk-or-test-123456"],
  ["anthropic", "https://api.anthropic.com/v1", "sk-ant-test-123456"],
];
for (const [provider, baseUrl, apiKey] of extras) {
  click('[data-action="ai-tab"][data-tab="keys"]');
  click('[data-action="ai-add"]');
  submit('form[data-form="ai-save"]', { provider, apiKey, baseUrl, model: "m-" + provider });
}
assert.equal(keys().connections.length, 5, "five providers must be storable");

/* The sixth is refused with the documented message. */
click('[data-action="ai-tab"][data-tab="keys"]');
assert.match(text(), /Limit reached/, "UI must explain the 5-provider cap");
assert.equal(doc.querySelector('[data-action="ai-add"]'), null, "add button hides at the cap");

/* --------------------------- switch the active provider ------------------ */
const firstId = keys().activeId;
click('[data-action="ai-use"]');           // first "Use for chat" = connection #2
await settle();
const activeId = keys().activeId;
assert.notEqual(activeId, firstId, "Use must change the active provider");
const switched = keys().connections.find((c) => c.id === activeId);
assert.equal(switched.provider, "openai", "the second connection should now be active");

calls.length = 0;
click('[data-action="ai-tab"][data-tab="chat"]');
submit('form[data-form="ai-send"]', { message: "Second question" });
await settle();
assert.equal(calls.length, 1);
assert.match(calls[0].url, /api\.openai\.com/, "chat must call the switched provider");
assert.match(calls[0].auth, /sk-test-openai-123456/, "the switched key must be used");

/* ------------------------------ remove a key ----------------------------- */
click('[data-action="ai-tab"][data-tab="keys"]');
const before = keys().connections.length;
click('[data-action="ai-remove"]');
assert.equal(keys().connections.length, before - 1, "Remove must delete one connection");
assert.match(text(), /4 of 5 connected/);

/* --------------------------- error handling surfaces --------------------- */
click('[data-action="ai-tab"][data-tab="chat"]');
window.fetch = async () => ({ ok: false, status: 401, text: async () => '{"error":{"message":"bad key"}}' });
submit('form[data-form="ai-send"]', { message: "This should fail" });
await settle();
assert.match(text(), /Request failed/);
assert.match(text(), /The API key was rejected/);
assert.match(text(), /bad key/);

/* The offline-only build must not expose any of this. */
const offlineDom = new JSDOM(readAi("index.html").replace(/<script src="ai\.js"><\/script>/, ""), {
  url: "https://localhost/",
  runScripts: "outside-only",
});
offlineDom.window.scrollTo = () => {};
offlineDom.window.eval(readAi("data.js"));
offlineDom.window.eval(readAi("logic.js"));
offlineDom.window.eval(readAi("app.js"));
assert.equal(offlineDom.window.StudyXChatPanel, undefined, "offline build has no chat client");
assert.equal(
  offlineDom.window.document.querySelector('.tabs a[data-nav="chat"]').hidden,
  true,
  "offline build hides the AI tab",
);

console.log("AI DOM smoke test passed:", {
  providers: keys().connections.length + 1,
  cap: 5,
  calls: calls.length,
});

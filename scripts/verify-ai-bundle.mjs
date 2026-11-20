/* Verifies the AI flavour of the app before it is packaged.
 *
 * The AI build is the offline app plus an explicit opt-in network surface: only
 * ai.js may talk to the internet, and only to the provider the user configured.
 * Everything else must stay byte-identical to the offline bundle.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const aiDir = join(root, "offline-ai");
assert.ok(existsSync(aiDir), "offline-ai/ missing — run `npm run ai:bundle` first");

const read = (f) => readFileSync(join(aiDir, f), "utf8");
const files = readdirSync(aiDir).filter((f) => statSync(join(aiDir, f)).isFile()).sort();

const required = [
  "ai.js",
  "app.js",
  "data.js",
  "index.html",
  "logic.js",
  "manifest.json",
  "styles.css",
  "studyx-art.jpg",
  "studyx-icon.png",
];
required.forEach((f) => assert.ok(files.includes(f), `missing offline-ai/${f}`));

/* ------------------------------- shell ---------------------------------- */
const html = read("index.html");
assert.match(html, /<script src="ai\.js"><\/script>/, "AI bundle must load ai.js");
assert.match(html, /data-nav="chat"[^>]*>AI Chat</, "AI tab missing from the nav");
assert.match(html, /class="offline-badge ai-badge"/, "AI build must not claim to be OFFLINE");
assert.match(html, /<title>StudyX AI<\/title>/);
assert.ok(!/ai-slot:/.test(html), "ai-slot placeholder was not replaced");
assert.match(read("app.js"), /StudyXChatPanel/);
assert.match(read("app.js"), /case "chat"/);
assert.match(read("styles.css"), /\.chat-bubble/);
assert.match(read("styles.css"), /\.chat-row\.is-mine/);

/* Only ai.js may reference the network. */
const networkRe = /https?:\/\/(?!www\.w3\.org\/2000\/svg)/i;
for (const f of files.filter((x) => /\.(html?|js|json|css)$/i.test(x) && x !== "ai.js")) {
  assert.ok(!networkRe.test(read(f)), `offline-ai/${f} must stay network-free`);
  assert.ok(!/XMLHttpRequest|\bfetch\s*\(/.test(read(f)), `offline-ai/${f} must not do network calls`);
}

/* ------------------------------- ai.js ---------------------------------- */
const ai = read("ai.js");
assert.match(ai, /var AI_BUILD = true;/);
assert.match(ai, /var MAX = 5;/);
assert.match(ai, /var MIN = 1;/);
assert.match(ai, /ml\.ai\.v1/);
assert.match(ai, /StudyXChatPanel/);
["openai", "anthropic", "gemini", "openrouter", "groq", "perplexity", "custom"].forEach((p) =>
  assert.match(ai, new RegExp(`id: "${p}"`), `provider ${p} missing`),
);
assert.match(ai, /chat\/completions/);
assert.match(ai, /Authorization: "Bearer "/);
assert.match(ai, /at most " \+ MAX \+ " providers/);
/* The simple form asks for a key only; model/URL stay behind "Advanced". */
assert.match(ai, /Name <span class="small muted">\(optional\)<\/span>/);
assert.match(ai, /ui\.advanced \? values\.baseUrl : ""/);
assert.match(ai, /sonar/, "Perplexity preset must default to the sonar model");
assert.match(ai, /https:\/\/api\.perplexity\.ai/);
/* It must not silently fall back to any built-in key or StudyX server. */
assert.doesNotMatch(ai, /AI_API_KEY/, "the AI APK must use only the user's own key");
assert.doesNotMatch(ai, /vercel\.app/, "the AI chat never goes through the hosted app");
assert.doesNotMatch(ai, /localStorage\.setItem\([^)]*apiKey/, "keys must live in the versioned blob");

/* ------------------------- bundle consistency --------------------------- */
for (const f of ["app.js", "data.js", "logic.js", "styles.css", "studyx-art.jpg", "studyx-icon.png"]) {
  const a = readFileSync(join(root, "offline", f));
  const b = readFileSync(join(aiDir, f));
  if (f === "styles.css") continue; // chat styles are appended to the shared file
  assert.ok(a.equals(b), `offline-ai/${f} drifted from offline/${f}`);
}

/* The offline build must remain untouched by this step. */
assert.ok(!existsSync(join(root, "offline", "ai.js")), "ai.js must not live in offline/");
assert.ok(!/StudyXChatPanel/.test(readFileSync(join(root, "offline/index.html"), "utf8")));

const manifest = JSON.parse(read("manifest.json"));
assert.equal(manifest.short_name, "StudyX AI");
assert.ok(manifest.icons.some((i) => i.src === "studyx-icon.png"));

console.log("AI bundle verification passed:", {
  files: files.length,
  providers: 7,
  maxConnections: 5,
  minConnections: 1,
  offlineDirUntouched: true,
});

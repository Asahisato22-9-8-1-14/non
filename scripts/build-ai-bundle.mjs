/* Builds the AI flavour of the web bundle from the offline one.
 *
 * Input : offline/ (fully offline StudyX) + ai/ai.js (network client)
 * Output: offline-ai/ (copy of offline/ with the AI tab enabled)
 *
 * The offline APK stays exactly as it was: it never ships ai.js and
 * verify-offline.mjs still fails the build if any network code appears there.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "offline");
const out = join(root, "offline-ai");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let copied = 0;
for (const name of readdirSync(src)) {
  const from = join(src, name);
  if (!statSync(from).isFile()) continue;
  copyFileSync(from, join(out, name));
  copied += 1;
}

copyFileSync(join(root, "ai/ai.js"), join(out, "ai.js"));

const indexPath = join(out, "index.html");
const html = readFileSync(indexPath, "utf8");
const SLOT = /<!--\s*ai-slot:[\s\S]*?-->/;
if (!SLOT.test(html)) {
  throw new Error("offline/index.html is missing the ai-slot comment");
}
writeFileSync(indexPath, html.replace(SLOT, '<script src="ai.js"></script>'));

/* The AI build must declare that it needs the network in its web manifest so
 * the scope is explicit, and the launcher subtitle must not claim "OFFLINE". */
const manifestPath = join(out, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.name = "StudyX AI";
manifest.short_name = "StudyX AI";
manifest.description =
  "StudyX with an AI study chat. Study content works offline; AI replies need internet and your own API key.";
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const manifestHtml = readFileSync(indexPath, "utf8");
writeFileSync(
  indexPath,
  manifestHtml
    .replace(/<title>StudyX<\/title>/, "<title>StudyX AI</title>")
    .replace(
      /<span class="offline-badge" title="No internet needed">OFFLINE<\/span>/,
      '<span class="offline-badge ai-badge" title="Study content offline; AI needs internet">AI</span>',
    ),
);

/* Sanity: the AI bundle must contain the chat client, and the offline source
 * must still be network-free. */
const built = readdirSync(out).sort();
for (const f of ["ai.js", "index.html", "app.js", "styles.css"]) {
  if (!built.includes(f)) throw new Error(`AI bundle is missing ${f}`);
}
if (!/StudyXChatPanel/.test(readFileSync(join(out, "ai.js"), "utf8"))) {
  throw new Error("ai.js does not expose StudyXChatPanel");
}

console.log("AI bundle built:", {
  files: built.length,
  copied,
  dir: "offline-ai",
  badge: "AI",
});

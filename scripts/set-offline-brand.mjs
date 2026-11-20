/* All builds are branded StudyX. This normalises the launcher strings for the
 * offline workflow (and the local offline build steps in README.md). The
 * internal app id is NOT changed: that keeps the WebView's localStorage data
 * across an upgrade. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// `node scripts/set-offline-brand.mjs "StudyX AI"` labels the AI build; with no
// argument it sets the offline launcher name.
const appName = process.argv[2] || "StudyX";
const strings = join(root, "android/app/src/main/res/values/strings.xml");
let xml = readFileSync(strings, "utf8");

xml = xml
  .replace(/<string name="app_name">[^<]*<\/string>/, `<string name="app_name">${appName}</string>`)
  .replace(/<string name="title_activity_main">[^<]*<\/string>/, `<string name="title_activity_main">${appName}</string>`);

writeFileSync(strings, xml);
console.log(`Launcher name set to ${appName}`);

/* Offline builds are branded StudyX. The online WebView APK keeps its own
 * Mindloom launcher name, so this patch runs only in the offline workflow (and
 * in the local offline build steps in README.md). The internal app id is NOT
 * changed: that keeps the WebView's localStorage data across an upgrade. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strings = join(root, "android/app/src/main/res/values/strings.xml");
let xml = readFileSync(strings, "utf8");

xml = xml
  .replace(/<string name="app_name">[^<]*<\/string>/, '<string name="app_name">StudyX</string>')
  .replace(/<string name="title_activity_main">[^<]*<\/string>/, '<string name="title_activity_main">StudyX</string>');

writeFileSync(strings, xml);
console.log("Offline launcher name set to StudyX");

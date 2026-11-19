import type { CapacitorConfig } from "@capacitor/cli";

// Offline flavour of the APK. `webDir` points at a fully self-contained static
// app and there is deliberately NO `server.url`: Capacitor serves the bundled
// files from its local WebView server, so the app works in airplane mode.
// The build workflow copies this file over capacitor.config.ts before `cap sync`.
// A distinct app id lets this offline build be installed next to the online
// WebView APK (debug builds are signed with different per-runner keys). It is
// deliberately kept unchanged by the rename so existing saved data survives.
const config: CapacitorConfig = {
  appId: "com.mindloom.studyapp.offline",
  appName: "StudyX",
  webDir: "offline",
  server: {
    androidScheme: "https",
  },
};

export default config;

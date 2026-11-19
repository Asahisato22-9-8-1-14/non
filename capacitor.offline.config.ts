import type { CapacitorConfig } from "@capacitor/cli";

// Offline flavour of the APK. `webDir` points at a fully self-contained static
// app and there is deliberately NO `server.url`: Capacitor serves the bundled
// files from its local WebView server, so the app works in airplane mode.
// The build workflow copies this file over capacitor.config.ts before `cap sync`.
const config: CapacitorConfig = {
  appId: "com.mindloom.studyapp",
  appName: "Mindloom",
  webDir: "offline",
  server: {
    androidScheme: "https",
  },
};

export default config;

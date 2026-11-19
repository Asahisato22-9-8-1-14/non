import type { CapacitorConfig } from "@capacitor/cli";

// The Android app is a thin WebView wrapper around the deployed HTTPS web app.
// A native APK cannot run the Next.js server or a local PostgreSQL instance,
// so we point Capacitor at the live URL instead of doing a static export.
const config: CapacitorConfig = {
  appId: "com.mindloom.studyapp",
  appName: "Mindloom",
  webDir: "public",
  server: {
    url: process.env.LIVE_APP_URL || "https://example.com",
    cleartext: false,
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

// The Android app is a thin WebView wrapper around the deployed HTTPS web app.
// A native APK cannot run the Next.js server or a local PostgreSQL instance,
// so we point Capacitor at the live URL instead of doing a static export.
const config: CapacitorConfig = {
  appId: "com.mindloom.studyapp",
  appName: "Mindloom",
  webDir: "public",
  server: {
    // Deployed Vercel app. A repository secret can override this at build time,
    // but GitHub's integration token cannot manage secrets, so the live URL is
    // also the built-in fallback (otherwise the APK would open example.com).
    url: process.env.LIVE_APP_URL || "https://non-ashen.vercel.app",
    cleartext: false,
  },
};

export default config;

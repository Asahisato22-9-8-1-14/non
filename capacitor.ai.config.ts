import type { CapacitorConfig } from "@capacitor/cli";

// Third flavour: StudyX AI. The bundled web app is the offline StudyX plus an
// AI Chat tab (offline-ai/). Study content still works with no connection; only
// the chat needs internet, and it uses the key the user saved on the device.
//
// A distinct app id makes this installable side by side with the offline APK
// (`...offline`) and the hosted WebView APK (`com.mindloom.studyapp`).
//
// `CapacitorHttp` is enabled so the WebView's fetch() is proxied through native
// Android HTTP: provider CORS rules (OpenAI blocks browsers) do not apply, and
// the key never leaves the device.
const config: CapacitorConfig = {
  appId: "com.mindloom.studyapp.ai",
  appName: "StudyX AI",
  webDir: "offline-ai",
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: {
    androidScheme: "https",
  },
};

export default config;

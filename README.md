# non

A Next.js (App Router) + PostgreSQL study app combining mind maps, flashcard decks
with spaced repetition, notes, and an interactive "study system" guide.

## What's here

- `src/app/` — pages (dashboard, decks, maps, notes, study) and the JSON API routes
- `src/components/` — editors, pickers, study session UI, and the study-system widgets
- `src/db/` — Drizzle ORM schema (`src/db/schema.ts`) and connection (`src/db/index.ts`)
- `src/lib/` — queries, SRS logic, formatting, types, and theme helpers
- `mind-mapping-flashcard-website.zip` — the original uploaded archive, kept for reference

## Getting started

Requires Node.js and a PostgreSQL database.

```bash
npm install
```

Create a `.env` file with your database connection string (the app reads
`DATABASE_URL`; `src/db/index.ts` throws at import time if it is missing):

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

Create the tables from the Drizzle schema, then start the dev server:

```bash
npx drizzle-kit push
npm run dev
```

Open http://localhost:3000. Other scripts: `npm run build`, `npm run lint`,
`npm run typecheck`.

> `drizzle.config.json` contains a default local connection string used by
> `drizzle-kit`; update it if your database differs from `DATABASE_URL`.

## Android APK (Capacitor)

The APK is a thin WebView wrapper around the **deployed HTTPS web app** — an
Android app cannot run the Next.js server or a local PostgreSQL database, so
there is no static Next.js export. `capacitor.config.ts` reads `LIVE_APP_URL`
and falls back to `https://example.com`; `cleartext` is disabled, so the URL
must be HTTPS.

- `capacitor.config.ts` — app id `com.mindloom.studyapp`, name `Mindloom`, `webDir: public`
- `android/` — native project generated with `npx cap add android` (config files tracked, build outputs ignored)
- `public/manifest.json` — web app manifest (linked from `src/app/layout.tsx`)

Local Android work requires a JDK 17 and the Android SDK, then:

```bash
npm ci --legacy-peer-deps
LIVE_APP_URL=https://your-deployed-app.example.com npx cap sync android
cd android && ./gradlew assembleDebug
```

### Automated release

`.github/workflows/build-apk.yml` runs on `v*` tag pushes or manual
`workflow_dispatch`. It installs with `npm ci --legacy-peer-deps`, sets up Node
22 + Java 17 (temurin) and activates JDK 21 for Gradle (Capacitor 8's Android
library compiles with `sourceCompatibility = 21`, so a JDK 17-only build fails),
injects `LIVE_APP_URL` from the repository secret of
the same name, runs `npx cap sync android`, builds with
`./gradlew assembleDebug`, uploads the APK as a workflow artifact, and attaches
`app-debug.apk` to a GitHub Release via `softprops/action-gh-release@v2`.

Add the secret under **Settings → Secrets and variables → Actions**:
`LIVE_APP_URL` = your deployed HTTPS URL. Without it the APK points at the
`https://example.com` fallback.

```bash
git tag v1.0.0
git push origin v1.0.0
```

The debug APK is for sideloading/testing; Play Store distribution needs a
signed release build/AAB and a keystore secret.

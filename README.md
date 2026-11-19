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
npm run db:push
npm run dev
```

Open http://localhost:3000. Other scripts: `npm run build`, `npm run lint`,
`npm run typecheck`, `npm run db:push`.

`drizzle.config.ts` reads `DATABASE_URL` from `.env` (or the deployment's
environment), so the same command works locally and on a hosted database.

## Free deployment (Vercel + Neon)

This app needs a Node server (`force-dynamic` pages + API routes) and Postgres,
so static hosts like GitHub Pages cannot run it. The no-cost combination is
**Vercel Hobby** for Next.js + **Neon Free** for Postgres; both are free with no
card, no time limit.

1. Create a free database at [neon.tech](https://neon.tech). Copy its **pooled**
   connection string (`-pooler` host, `?sslmode=require`).
2. Import this repository into [vercel.com](https://vercel.com/new) (Hobby plan).
   Vercel detects Next.js automatically — no build settings needed.
3. In **Project → Settings → Environment Variables**, add:
   `DATABASE_URL` = the Neon pooled URL. Apply to Production, Preview and Development.
4. Deploy. Then create the tables once, from your own machine with `.env` set to
   the same URL: `npm run db:push`.
5. Check `https://<your-project>.vercel.app/api/health` returns `{"ok":true}`.
6. Use that HTTPS URL as the `LIVE_APP_URL` repository secret for the APK build.

Notes: Vercel Hobby is for personal/non-commercial use, and Neon's free compute
scales to zero after ~5 minutes idle — the first request after a quiet period is
slower, so the APK may show a short cold-start delay. Use a persistent (paid)
host if you need always-on behaviour.

Current deployment: **https://non-ashen.vercel.app** (public custom domain;
Vercel's SSO deployment protection does not apply to custom domains). The
database tables are created with `npm run db:push -- --force`. This URL is also
the built-in fallback in `capacitor.config.ts`, so an APK can be built even when
the `LIVE_APP_URL` repository secret is not configured.

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

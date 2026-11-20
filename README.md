<p align="center">
  <img src="StudyX/study-x-icon.png" alt="StudyX icon — oak branch, lanterns and quill" width="150" />
</p>
<p align="center">
  <img src="StudyX/study-x-artwork.png" alt="Full StudyX parchment artwork" width="220" />
</p>

# StudyX

**Offline Android study app** with a parchment / oak-green / lantern-gold / ink
interface, the supplied quill-and-lantern launcher icon, and a matching splash
screen. Everything runs inside the APK — no Wi-Fi, login, server or database.

## Repository description (GitHub About)

StudyX 🪶 — study app with two builds: a fully offline Android APK (49-step Justin Sung system, GRINDE/SIR widgets, mind maps, notes, flashcards + Leitner SRS, parchment theme, oak/lantern/quill icon) and a hosted Next.js + Postgres web app with an AI study chat (OpenAI, Claude, Gemini, OpenRouter, Groq or any OpenAI-compatible API key you connect in Settings). Live: https://non-ashen.vercel.app — APK in Releases.

> The GitHub integration token here can push code/releases but cannot edit
> repository settings. `StudyX/GITHUB_DESCRIPTION.md` contains the exact text to
> paste into GitHub → Settings → General → About → Description; the icon is
> rendered above and in the Release notes.

## What's here

- `src/app/` — pages (dashboard, decks, maps, notes, study) and the JSON API routes
- `src/components/` — editors, pickers, study session UI, and the study-system widgets
- `src/app/api/chat/`, `src/app/api/ai/test/`, `src/app/api/settings/ai/` — AI assistant, provider test and key storage
- `src/db/` — Drizzle ORM schema (`src/db/schema.ts`) and connection (`src/db/index.ts`)
- `src/lib/` — queries, SRS logic, formatting, types, and theme helpers
- `offline/` — fully self-contained offline app bundled inside the offline APK
- `StudyX/study-x-icon.png` — launcher / favicon / header icon
- `StudyX/study-x-artwork.png` — full parchment artwork and splash source
- `offline/studyx-art.jpg` — compressed local background bundled in the APK
- `public/study-x-icon.png` — favicon for the hosted Next.js web app
- `scripts/` — offline data generator, offline verification and DOM smoke test
- `mind-mapping-flashcard-website.zip` — the original uploaded archive, kept for reference

## Three builds — pick the one you want

| Build | File | Needs internet? | What it is |
| --- | --- | --- | --- |
| **Offline APK** | `StudyX.apk` (`offline-v*`) | Never | Full app in airplane mode. No network code, no keys, no chat tab. |
| **AI APK** | `StudyX-AI.apk` (`ai-v*`) | Only for chat | Same parchment app + **AI Chat** tab with **your own 1–5 API keys**. |
| **Hosted web app** | `https://non-ashen.vercel.app` | Always | Next.js + Postgres version with chat history in the database. |

Both APKs install side by side (different app ids: `…studyapp.offline` and
`…studyapp.ai`) and both use the supplied oak / lantern / quill artwork.

### StudyX AI — offline app + your own API key

`StudyX-AI.apk` keeps everything the offline build has — 8 phases / 49 steps,
GRINDE, SIR, error analyser, checklist, mind maps, notes, flashcards, Leitner
review, dark/light parchment theme, back stack — and adds one tab:

1. **AI Chat → Providers → Add provider.** Pick OpenAI, Anthropic Claude,
   Google Gemini, OpenRouter, Groq, **Perplexity** or **Custom** (any
   OpenAI-compatible base URL). The form asks for just an **optional name** and
   **your API key** — the model and URL come from the preset. Tap **Change**
   only if you use a proxy, a self-hosted endpoint or a different model.
2. Save **1 to 5** connections; the list shows which one is *in use* and
   **Use for chat** switches provider. A sixth is refused until you remove one.
3. Chat: suggestions, plain-text answers, transcript kept on the device.
   **Test** sends a single `OK` round-trip and shows the provider's real error.

Where the key goes: it is stored in the APK's local storage on **your phone**
and sent **directly** to the provider you chose. There is no StudyX server in
the middle. The Android build enables Capacitor's native HTTP stack, so provider
CORS rules (OpenAI blocks browser calls) do not apply.

**The offline part never needs a connection.** With no key, the Chat tab simply
asks you to add one; maps, notes, decks and steps keep working in airplane mode.

Build it locally:

```bash
npm run ai:verify                       # build offline-ai/ + assert only ai.js has network code
cp capacitor.ai.config.ts capacitor.config.ts
node scripts/set-offline-brand.mjs "StudyX AI"
npx cap sync android && (cd android && ./gradlew assembleDebug)
```

or push an `ai-v*` tag and let `.github/workflows/build-ai-apk.yml` do it.

## AI chat + API connection (hosted app)

The hosted app now ships the AI assistant from your source ZIP, but it does
**not** come with any key or provider pre-connected — a key cannot be invented
or shipped safely in a public repo. Wire yours in ~60 seconds:

1. Open `https://non-ashen.vercel.app/settings` (or **Settings** icon in the
   hosted app header).
2. Pick a provider preset — **OpenAI**, **Anthropic Claude**, **Google Gemini**,
   **OpenRouter**, **Groq**, **Perplexity** or **Custom (any OpenAI-compatible
   URL)**.
3. Paste your own API key. Only the name (optional) and key are shown; the model
   and base URL are preset. **Change** reveals them for a proxy, a self-hosted
   endpoint (`https://my-proxy.example.com/v1`) or another model.
4. Press **Connect**, then **Test connection** — it sends one `OK` round-trip to
   `/chat/completions` and reports the exact provider error if anything fails.
   You can save **1 to 5** connections; the list shows which one is *in use*
   and **Use** switches chat to another. Adding a sixth is blocked until you
   remove one.
5. Open **AI Chat** in the nav: streaming replies, Markdown, conversation list,
   attach a note or mind map as context, "Explain simply / Quiz me / Make
   flashcards / Build a study plan" shortcuts.

How the link is stored: the key is saved in Postgres (`app_settings` table) and
read only by server routes (`/api/settings/ai`, `/api/ai/test`,
`/api/chat/...`); it is never exposed to the browser or to the offline APK.
`GET /api/settings/ai` returns only a masked preview.

**Server-side alternative (no clicking):** set these in Vercel → Project →
Settings → Environment Variables (Production) and redeploy:

| Key | Example | Notes |
| --- | --- | --- |
| `AI_API_KEY` | `sk-...` | your provider key (or `OPENAI_API_KEY`) |
| `AI_PROVIDER` | `openai` / `anthropic` / `gemini` / `openrouter` / `groq` / `custom` | optional, default `openai` |
| `AI_BASE_URL` | `https://api.openai.com/v1` | optional, must be OpenAI-compatible |
| `AI_MODEL` | `gpt-4o-mini` | optional |

A key saved in **Settings** wins over the environment variables.

Check the live status at `/api/settings/ai` (example while unconfigured):
`{"configured": false, "source": null, "provider": "openai", ...}`.

> The AI chat lives **only in the hosted web app**. The offline APK is
> deliberately network-free, so it cannot call an AI API without breaking its
> airplane-mode guarantee.

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
`npm run typecheck`, `npm run db:push`, `npm run offline:verify`
(verifies the bundled offline app and asserts it contains no network calls).

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

The APK workflow probes `<url>/api/health`; if the secret is unset or does not
return `{"ok":true}` (for example a stale placeholder such as a suspended
Render service), it falls back to the Vercel deployment automatically. Keep the
secret updated to `https://non-ashen.vercel.app` for clarity.

## Offline APK — StudyX (no internet needed)

The mislabelled `study x.json` attachment is a ZIP, saved as
`StudyX/study-x-source.zip`. That source snapshot is a Next.js app with AI/chat
API routes and a database, so it is kept as reference material. The offline APK
uses the supplied `StudyX/study-x-artwork.png` as its visual direction:
parchment paper, oak canopy, three hanging lanterns, an ink-circle quill emblem
and serif "Study X" lettering. The same square crop is the launcher icon,
favicon and header badge; the full artwork is the native splash and a subtle
in-app background.

`.github/workflows/build-offline-apk.yml` builds a **second APK flavour** from
`capacitor.offline.config.ts`. It has **no `server.url`**: Capacitor serves the
files in `offline/` from inside the APK, so the app works in airplane mode. It is branded **StudyX**: the launcher name, in-app header, APK file
`StudyX.apk` and the `StudyX/` folder all use the new name. The internal app id
stays `com.mindloom.studyapp.offline` on purpose, so upgrading keeps the saved
`localStorage` data; it can still be installed alongside the online APK.

What is bundled and fully usable offline:

- All 8 phases / 49 study steps (explanations, insights, related links),
  progress checkboxes, GRINDE framework, SIR review model + timeline,
  flashcard demo, practice-error analyser and final exam checklist.
- Mind maps with draggable nodes, notes, flashcard decks and Leitner-box spaced
  repetition, dashboard stats, dark mode.
- All data is stored in the WebView's `localStorage`. Settings → Export backup
  gives you a JSON copy; Import backup restores it. There is no sync with the
  hosted web app — the two APKs have separate data.

No CDN, no web fonts, no `fetch()`, no service worker and no database:
`npm run offline:verify` asserts this on every offline build. Regenerate the
bundled study content from `src/components/system/steps.ts` with
`npm run offline:data` (Node 22 type-stripping).

Mobile behaviour:

- **Status bar:** `activity_main.xml` uses `android:fitsSystemWindows="true"` and
  the header reserves `env(safe-area-inset-top)`, so the clock/notification/
  battery icons never cover the **StudyX** brand and icon. `@capacitor/status-bar` keeps
  the bar colour and icon contrast in sync with the theme.
- **Dark mode:** a labelled `☾ Dark` / `☀ Light` button is always in the header,
  plus a second switch on the Guide page — it is no longer buried in Settings.
- **Back button:** `@capacitor/app`'s `backButton` listener drives a navigation
  stack, so Android's back key walks back through the screens you opened
  (deck detail → deck list → guide) instead of closing the app. A visible `←`
  button appears whenever there is something to go back to; at the root,
  pressing back twice exits.
- **Tab highlight:** the active tab always matches the visible screen. Hover
  styling is limited to real mouse pointers (touch WebViews otherwise keep the
  last tapped tab highlighted), the focused tab is blurred on navigation, and
  the active pill uses an accent tint plus `aria-current="page"`.

Build it locally with:

```bash
npm ci --legacy-peer-deps
npm run offline:verify
cp capacitor.offline.config.ts capacitor.config.ts
node scripts/set-offline-brand.mjs
npx cap sync android
cd android && ./gradlew assembleDebug
```

Push an `offline-v*` tag (for example `offline-v1.0.5`) to trigger the workflow;
it publishes a Release with the asset `StudyX.apk` and mirrors
`StudyX/StudyX.apk` into the branch for direct download. The `v1.0.x` releases remain the **online** build.

## Android APK (Capacitor, online build)

The default `v*` APK is a thin WebView wrapper around the **deployed HTTPS web
app** — an Android app cannot run the Next.js server or a local PostgreSQL
database. `capacitor.config.ts` reads `LIVE_APP_URL` and falls back to the live
Vercel URL; `cleartext` is disabled, so the URL must be HTTPS. Use the offline
flavour above if you need the app without a connection.

- `capacitor.config.ts` — app id `com.mindloom.studyapp`, name `StudyX`, `webDir: public`
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
`LIVE_APP_URL` = your deployed HTTPS URL. The workflow probes
`<url>/api/health`; if the secret is missing or points at a dead service, it
falls back to the live Vercel URL baked into `capacitor.config.ts`. The offline
APK needs neither this secret nor a database.

```bash
git tag v1.0.0
git push origin v1.0.0
```

The debug APK is for sideloading/testing; Play Store distribution needs a
signed release build/AAB and a keystore secret.

## Connecting an external tool (REA)

`morluto/rea` is a local MCP server/CLI for reverse-engineering agents, not a
web API — see [docs/REA-CONNECTION.md](docs/REA-CONNECTION.md) for the exact
registration commands (`npx -y rea-agents@6.10.1 mcp`), the `rea setup` flags,
`rea doctor` verification, and the Node.js requirement it currently fails on
here. StudyX itself does not depend on REA.

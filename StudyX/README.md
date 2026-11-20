<p align="center">
  <img src="study-x-icon.png" alt="StudyX icon" width="150" />
</p>
<p align="center">
  <img src="study-x-artwork.png" alt="StudyX parchment artwork" width="220" />
</p>

# StudyX

**Fully offline Android study app.** `StudyX.apk` opens and works in airplane
mode: no Vercel URL, no Neon/PostgreSQL, no login, no CDN, no web font, no
`fetch()` and no service worker.

## App information (also mirrored in the GitHub repository description)

- **Study system:** 8 phases / 49 connected Justin Sung steps with explanations,
  insights, related links and progress checkboxes.
- **Widgets:** GRINDE framework, SIR review model + timeline, flashcard demo,
  practice-error analyser and final exam checklist.
- **Create & review:** draggable mind maps, notes, flashcard decks and
  Leitner-box spaced repetition, dashboard stats.
- **Mobile UX:** parchment / oak / lantern-gold / ink theme with the supplied
  quill icon, full-artwork splash, dark/light mode, status-bar-safe header,
  labelled `Dark / Light` button, Instagram-style Android back stack, single
  correct active tab, and press-back-twice to exit.
- **Data:** all decks, cards, maps, notes and progress live in the WebView's
  `localStorage`. Settings → Export backup / Import backup gives a JSON copy.
  Data does **not** sync with the hosted web app. Installing over the previous
  offline build keeps the data because the internal app id is unchanged.
- **Build:** Capacitor 8, `webDir: "offline"`, no `server.url`; debug-signed
  sideload APK, not a Play Store release.

## Files

- `StudyX.apk` — current offline APK.
- `study-x-icon.png` — square launcher / favicon / header icon.
- `study-x-artwork.png` — full supplied poster, used for splash and theme.
- `study-x-source.zip` — the user-supplied Next.js source ZIP (reference only;
  its AI/chat pages need a server + database, so they are not in the APK).
- `interface-reference.jpg` — earlier UI screenshot reference.
- `GITHUB_DESCRIPTION.md` — exact GitHub About text, icon/social-preview note,
  homepage and topics (the integration token cannot edit repo settings here).

## Download

Direct mirror:
https://github.com/Asahisato22-9-8-1-14/non/raw/refs/heads/arena/032b4ea2-non/StudyX/StudyX.apk

Current release:
https://github.com/Asahisato22-9-8-1-14/non/releases/tag/offline-v1.0.5

GitHub currently resolves the old `vihanpoojary4392/non` links to
`Asahisato22-9-8-1-14/non`.

## Install

Enable **Install unknown apps**, tap the APK and choose **Install anyway** if
Play Protect warns about the debug signature.

Push an `offline-v*` tag to rebuild; the `v*` workflow still builds the online
WebView APK.

## Two APKs in this folder

| File | Release | Internet | Notes |
| --- | --- | --- | --- |
| `StudyX.apk` | `offline-v*` | never | fully offline build |
| `StudyX-AI.apk` | `ai-v*` | chat only, with your own key | same app + AI Chat tab |

`StudyX-AI.apk` adds **AI Chat**: save 1–5 provider keys (OpenAI, Claude,
Gemini, OpenRouter, Groq or any OpenAI-compatible URL) on the device, switch the
active provider at any time, and chat while the rest of StudyX stays usable
offline. Keys never touch a StudyX server — they go straight from your phone to
the provider. Install both side by side; they have different app ids.

<p align="center">
  <img src="study-x-icon.png" alt="StudyX icon" width="130" />
</p>

# StudyX — two APKs, one interface

Both builds use the supplied parchment / oak-branch / three-lantern /
ink-quill "Study X" artwork as launcher icon, splash screen and in-app theme.

| Build | File | Size | Internet | Release |
| --- | --- | --- | --- | --- |
| **Offline** | `StudyX.apk` | 9,866,667 B | never | `offline-v1.0.5` |
| **AI** | `StudyX-AI.apk` | 9,876,972 B | chat only | `ai-v1.0.0` |

They install side by side — `com.mindloom.studyapp.offline` and
`com.mindloom.studyapp.ai` — without a factory reset.

SHA-256

```
171a722bb2d95c6ae1c9e7917c0c008e98b3f2e6f128aa245ec66919634e2455  StudyX.apk
9dac5aa225a7891b89f1b5450549359a36224b1cba358396bdff5e1a6bca504e  StudyX-AI.apk
```

## StudyX AI (`StudyX-AI.apk`)

Identical study app plus an **AI Chat** tab:

1. **Providers** → **Add provider** → OpenAI, Anthropic Claude, Google Gemini,
   OpenRouter, Groq, **Perplexity** or **Custom** (any OpenAI-compatible base URL).
2. Paste **your own key** — only the name (optional) and key are asked for;
   model and URL come from the preset. **Change** reveals them for a proxy. Save **1 to 5** connections; **Use for chat**
   switches provider, **Edit** changes model/URL, **Remove** deletes it.
3. **Test** sends one `OK` round-trip and shows the provider's real error.
4. Anything you chat is kept on the device; keys never leave it except in the
   request to the provider you chose.

Offline parts — 8 phases / 49 steps, GRINDE, SIR, practice-error analyser, exam
checklist, mind maps, notes, flashcard decks, Leitner review, dark/light theme,
back stack — work with no connection. With no key saved, Chat just asks for one.

The AI build uses Android's native HTTP stack (CapacitorHttp), so provider CORS
rules that block browsers (OpenAI) do not apply.

## Downloads

- AI APK: https://github.com/Asahisato22-9-8-1-14/non/raw/refs/heads/arena/032b4ea2-non/StudyX/StudyX-AI.apk
- Offline APK: https://github.com/Asahisato22-9-8-1-14/non/raw/refs/heads/arena/032b4ea2-non/StudyX/StudyX.apk
- AI release: https://github.com/Asahisato22-9-8-1-14/non/releases/tag/ai-v1.0.0
- Offline release: https://github.com/Asahisato22-9-8-1-14/non/releases/tag/offline-v1.0.5
- QR codes: `StudyX-AI-qr.png`, `StudyX-qr.png`

Enable **Install unknown apps** and tap **Install anyway** for the debug
signature. These are sideload/testing builds, not Play Store uploads.

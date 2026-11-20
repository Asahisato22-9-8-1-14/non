# StudyX

`StudyX.apk` is the offline Android build: all 49 study steps, mind maps, notes,
flashcards and spaced-repetition progress are bundled inside the APK. It needs
no internet, no Vercel URL and no database.

Direct download from this branch:
https://github.com/vihanpoojary4392/non/raw/refs/heads/arena/032b4ea2-non/StudyX/StudyX.apk

The launcher name, in-app header, APK file and folder are all **StudyX**. The
internal Android app id is unchanged, so installing this over the previous
offline build keeps your saved notes, decks and progress.

Full notes: `../exports/StudyX/README.md` (local export folder) or the GitHub
Release for the current `offline-v*` tag.

## Reference files

- `study-x-source.zip` — the attachment named `study x.json` is actually a ZIP.
  It is a newer Next.js source snapshot with AI/chat + settings pages that need
  a server, database and API keys. It is saved here for reference; it is **not**
  bundled into the offline APK.
- `interface-reference.jpg` — the screenshot of the StudyX interface to keep
  (dark header, OFFLINE badge, Guide/Home/Maps/Notes/Cards/More tabs).

The offline APK keeps that interface and uses only the self-contained files in
`offline/`.

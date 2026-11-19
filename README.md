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

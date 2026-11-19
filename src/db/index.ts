import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// `next build` imports route modules to collect page metadata. Throwing here
// would break a production build when DATABASE_URL is only supplied at runtime
// (e.g. Vercel), so fail fast in development but allow the build to proceed.
// `pg` connects lazily, so a missing URL surfaces as a connection error on the
// first query instead of at import time.
if (!databaseUrl && process.env.NODE_ENV !== "production") {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

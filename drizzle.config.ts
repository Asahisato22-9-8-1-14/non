import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Works locally (from .env) and on hosts like Vercel/Neon (from the
// deployment's DATABASE_URL environment variable).
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
});

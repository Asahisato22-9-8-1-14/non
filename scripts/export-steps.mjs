// Extracts the study-system reference content from the TypeScript source so the
// offline APK ships exactly the same 8 phases / 49 steps as the web app.
// Run with: node --experimental-strip-types scripts/export-steps.mjs
import { PHASES, STEPS, TOTAL_STEPS } from "../src/components/system/steps.ts";

process.stdout.write(
  JSON.stringify({ phases: PHASES, steps: STEPS, total: TOTAL_STEPS }),
);

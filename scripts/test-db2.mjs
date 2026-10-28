// Test raw HTTPS fetch to see what's blocking
const host = "ep-jolly-mountain-b5doskvz-pooler.c-7.us-east-2.aws.neon.tech";

console.log("Testing fetch to:", host);
try {
  const res = await fetch(`https://${host}/`, { signal: AbortSignal.timeout(8000) });
  console.log("Fetch status:", res.status);
} catch (e) {
  console.error("Fetch error:", e.message, e.cause?.message, e.cause?.code);
}

// Also test the neon HTTP API endpoint format
console.log("\nTesting neon driver with extended debug...");
import { neon } from "@neondatabase/serverless";
import { neonConfig } from "@neondatabase/serverless";

// Enable fetch debug
neonConfig.fetchConnectionCache = false;

const sql = neon(
  "postgresql://neondb_owner:npg_1wVXhipYy4eO@ep-jolly-mountain-b5doskvz-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
);

try {
  const r = await sql`SELECT 1 as n`;
  console.log("✅ OK:", r);
} catch (e) {
  console.error("❌ Error:", e.message);
  console.error("Cause:", e.sourceError?.cause);
}


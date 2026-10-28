import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:npg_1wVXhipYy4eO@ep-jolly-mountain-b5doskvz-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require";

const sql = neon(url);

try {
  const result = await sql`SELECT version()`;
  console.log("✅ Connection OK:", result[0].version);
} catch (e) {
  console.error("❌ Connection FAILED:");
  console.error("  message:", e.message);
  console.error("  code:", e.code);
  console.error("  full:", e);
}


import "server-only";
import { sql, initDb } from "@/lib/db";

export async function getDatabaseVersion(): Promise<string> {
  await initDb();
  const result = await sql`SELECT version()`;
  return String(result[0].version);
}

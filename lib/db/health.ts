import "server-only";
import { sql } from "@/lib/db";

export async function getDatabaseVersion(): Promise<string> {
  const result = await sql`SELECT version()`;

  return String(result[0].version);
}
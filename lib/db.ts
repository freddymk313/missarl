import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("La variable DATABASE_URL est absente du fichier .env.local");
}

export const sql = neon(databaseUrl);

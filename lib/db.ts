import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

type QueryResultRow = Record<string, unknown>;
type SqlClient = (
  strings: TemplateStringsArray | string,
  ...values: unknown[]
) => Promise<QueryResultRow[]>;

let sqlClient: SqlClient | undefined;

if (databaseUrl) {
  try {
    sqlClient = neon(databaseUrl) as unknown as SqlClient;
  } catch (err) {
    console.warn("[AI Studio] Failed to initialize Neon database client:", err);
  }
}

if (!sqlClient) {
  console.warn(
    "[AI Studio] DATABASE_URL not set or connection unavailable — using in-memory mock SQL client."
  );
  const mockSql: SqlClient = async (
    strings: TemplateStringsArray | string
  ) => {
    const query = typeof strings === "string" ? strings : strings.join("?");
    if (/SELECT\s+version\(\)/i.test(query)) {
      return [{ version: "PostgreSQL 16.0 (AI Studio Mock Neon Client)" }];
    }
    return [];
  };
  sqlClient = mockSql;
}

export const sql = sqlClient;

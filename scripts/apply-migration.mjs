import { neon, neonConfig } from "@neondatabase/serverless";
import { resolve4 } from "dns/promises";
import https from "https";
import fs from "fs";
import path from "path";

const host = "ep-jolly-mountain-b5doskvz-pooler.c-7.us-east-2.aws.neon.tech";

const [ip] = await resolve4(host);
console.log("Connecting via IP:", ip);

const customFetch = async (url, opts = {}) => {
  const urlObj = new URL(url);
  return new Promise((resolve, reject) => {
    const body = opts.body ? Buffer.from(opts.body) : null;
    const reqOpts = {
      method: opts.method || "GET",
      hostname: ip,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      headers: {
        ...opts.headers,
        Host: host,
        "Content-Length": body ? body.length : 0,
      },
      servername: host,
    };

    const req = https.request(reqOpts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const bodyBuf = Buffer.concat(chunks);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: { get: (k) => res.headers[k.toLowerCase()] },
          text: () => Promise.resolve(bodyBuf.toString()),
          json: () => Promise.resolve(JSON.parse(bodyBuf.toString())),
          arrayBuffer: () => Promise.resolve(bodyBuf.buffer),
        });
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
};

neonConfig.fetchFunction = customFetch;

const sql = neon(
  `postgresql://neondb_owner:npg_1wVXhipYy4eO@${host}/neondb?sslmode=require`
);

function splitSqlStatements(sqlText) {
  // Strip block comments and line comments
  const lines = sqlText.split("\n");
  const cleaned = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) continue;
    cleaned.push(line);
  }
  const full = cleaned.join("\n");
  // Split on semicolon followed by newline/whitespace
  return full
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function run() {
  console.log("Checking database connection and migrations...");
  const applied = await sql`SELECT version, name FROM schema_migrations ORDER BY version`;
  console.log("Currently applied migrations:", applied);

  const migrationFile = path.resolve("database/migrations/003_items_catalog.sql");
  const sqlContent = fs.readFileSync(migrationFile, "utf8");

  const statements = splitSqlStatements(sqlContent);
  console.log(`Found ${statements.length} SQL statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.slice(0, 60).replace(/\n/g, " ")}...`);
    try {
      await sql.query(stmt);
    } catch (e) {
      console.error(`Error on statement ${i + 1}:`, stmt);
      throw e;
    }
  }

  console.log("✅ All statements in 003_items_catalog.sql executed successfully!");

  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'items'
    ORDER BY ordinal_position
  `;
  console.log("Updated columns in items table:", cols.map(c => c.column_name));

  const cats = await sql`SELECT code, name_fr FROM item_categories ORDER BY sort_order`;
  console.log("Seeded categories:", cats);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});

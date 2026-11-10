import { neon, neonConfig } from "@neondatabase/serverless";
import { resolve4 } from "dns/promises";
import https from "https";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const host = new URL(databaseUrl.replace(/^postgresql:\/\//, "https://")).hostname;

const ips = await resolve4(host);
console.log(`Connecting to ${host} via IPs:`, ips);

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  timeout: 30000,
});

let ipIndex = 0;
const customFetch = async (url, opts = {}) => {
  const urlObj = new URL(url);
  const body = opts.body ? Buffer.from(opts.body) : null;
  const ipList = ips.length > 0 ? ips : [host];

  for (let attempt = 0; attempt < ipList.length; attempt++) {
    const ip = ipList[(ipIndex + attempt) % ipList.length];
    try {
      const res = await new Promise((resolve, reject) => {
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
          agent: httpsAgent,
          timeout: 15000,
        };

        const req = https.request(reqOpts, (resp) => {
          const chunks = [];
          resp.on("data", (c) => chunks.push(c));
          resp.on("end", () => {
            const bodyBuf = Buffer.concat(chunks);
            resolve({
              ok: resp.statusCode >= 200 && resp.statusCode < 300,
              status: resp.statusCode,
              headers: { get: (k) => resp.headers[k.toLowerCase()] },
              text: () => Promise.resolve(bodyBuf.toString()),
              json: () => Promise.resolve(JSON.parse(bodyBuf.toString())),
              arrayBuffer: () => Promise.resolve(bodyBuf.buffer),
            });
          });
        });

        req.on("timeout", () => req.destroy(new Error("Request timeout")));
        req.on("error", reject);
        if (body) req.write(body);
        req.end();
      });

      ipIndex = (ipIndex + attempt) % ipList.length;
      return res;
    } catch (err) {
      console.warn(`[Migration] IP ${ip} failed: ${err.message}. Retrying...`);
    }
  }
  throw new Error(`All resolved IPs for ${host} failed`);
};

neonConfig.fetchFunction = customFetch;

const sql = neon(process.env.DATABASE_URL);

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
  const appliedVersions = new Set(applied.map((a) => a.version));

  // Determine target files
  const argFile = process.argv[2];
  let filesToRun = [];

  if (argFile) {
    filesToRun.push(path.resolve(argFile));
  } else {
    const migrationsDir = path.resolve("database/migrations");
    const allFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const f of allFiles) {
      const match = f.match(/^(\d+)/);
      const version = match ? match[1] : null;
      if (!version || !appliedVersions.has(version)) {
        filesToRun.push(path.join(migrationsDir, f));
      }
    }
  }

  if (filesToRun.length === 0) {
    console.log("✅ All migrations are already up to date!");
    return;
  }

  console.log(`Found ${filesToRun.length} migration(s) to run:`, filesToRun.map((f) => path.basename(f)));

  for (const migrationFile of filesToRun) {
    const fileName = path.basename(migrationFile);
    console.log(`\n========================================`);
    console.log(`Running migration: ${fileName}`);
    console.log(`========================================`);
    const sqlContent = fs.readFileSync(migrationFile, "utf8");
    const statements = splitSqlStatements(sqlContent);
    console.log(`Found ${statements.length} SQL statement(s) to execute.`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.slice(0, 60).replace(/\n/g, " ")}...`);
      try {
        await sql.query(stmt);
      } catch (e) {
        console.error(`Error on statement ${i + 1} of ${fileName}:`, stmt);
        throw e;
      }
    }

    console.log(`✅ ${fileName} executed successfully!`);
  }

  console.log("\nAll requested migrations finished successfully.");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});

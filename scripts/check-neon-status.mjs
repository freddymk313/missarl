import { neon, neonConfig } from "@neondatabase/serverless";
import dns from "dns/promises";
import https from "https";
import dotenv from "dotenv";
dotenv.config({ path: "d:/me/missarl/.env.local" });

const databaseUrl = process.env.DATABASE_URL?.trim();
const neonHost = new URL(databaseUrl.replace(/^postgresql:\/\//, "https://")).hostname;

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  timeout: 30000,
});

function makeBypassFetch(ips, host) {
  let ipIndex = 0;
  return async (url, opts = {}) => {
    const urlObj = new URL(url.toString());
    const body = opts.body != null ? Buffer.from(opts.body) : null;
    const headers = {
      ...(opts.headers || {}),
      Host: host,
    };
    if (body) headers["Content-Length"] = String(body.length);
    const ipList = ips.length > 0 ? ips : [host];

    for (let attempt = 0; attempt < ipList.length; attempt++) {
      const ip = ipList[(ipIndex + attempt) % ipList.length];
      try {
        const res = await new Promise((resolve, reject) => {
          const req = https.request(
            {
              method: opts.method || "GET",
              hostname: ip,
              port: 443,
              path: urlObj.pathname + urlObj.search,
              headers,
              servername: host,
              agent: httpsAgent,
              timeout: 15000,
            },
            (resp) => {
              const chunks = [];
              resp.on("data", (c) => chunks.push(c));
              resp.on("end", () => {
                const buf = Buffer.concat(chunks);
                const resHeaders = resp.headers;
                resolve({
                  ok: (resp.statusCode || 0) >= 200 && (resp.statusCode || 0) < 300,
                  status: resp.statusCode || 0,
                  headers: { get: (k) => resHeaders[k.toLowerCase()] || null },
                  text: () => Promise.resolve(buf.toString()),
                  json: () => Promise.resolve(JSON.parse(buf.toString())),
                  arrayBuffer: () => Promise.resolve(buf.buffer),
                });
              });
            }
          );
          req.on("timeout", () => req.destroy(new Error("Request timeout")));
          req.on("error", reject);
          if (body) req.write(body);
          req.end();
        });
        return res;
      } catch (err) {
        console.warn(`Attempt ${attempt} on IP ${ip} failed:`, err.message);
      }
    }
    throw new Error("All IPs failed");
  };
}

async function test() {
  const addresses = await dns.lookup(neonHost, { all: true, family: 4 });
  const ips = addresses.map((a) => a.address).filter(Boolean);
  neonConfig.fetchFunction = makeBypassFetch(ips, neonHost);
  const sql = neon(databaseUrl);

  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'brand_snapshot'`;
  console.log("order_items has brand_snapshot?", cols.length > 0);

  const dniCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'delivery_note_items' AND column_name = 'observation_snapshot'`;
  console.log("delivery_note_items has observation_snapshot?", dniCols.length > 0);

  const dcTable = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'document_counters'`;
  console.log("document_counters table exists?", dcTable.length > 0);

  const latestBl = await sql`SELECT id, bl_number, order_id, invoice_id FROM delivery_notes ORDER BY created_at DESC LIMIT 1`;
  console.log("Latest BL in Neon:", latestBl);

  if (latestBl.length > 0) {
    const items = await sql`SELECT * FROM delivery_note_items WHERE delivery_note_id = ${latestBl[0].id}`;
    console.log("Items in latest BL:", items);
  }
}

test().catch(err => {
  console.error("TEST FAILED:", err);
});


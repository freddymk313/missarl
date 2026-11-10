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

  const orderId = '294759bc-8762-4918-9fa6-80cf83abf526';
  const existingOrderItems = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
  console.log("Current order_items for MIS/BC/2026/003:", existingOrderItems.length);

  if (existingOrderItems.length === 0) {
    // Backfill from the accepted quotation items
    const quoteItems = await sql`SELECT * FROM quotation_items WHERE quotation_id = 'c18212df-7902-4353-8a77-af394c04a694' ORDER BY line_number`;
    console.log("Found quotation items to backfill:", quoteItems.length);
    for (const qi of quoteItems) {
      const inserted = await sql`
        INSERT INTO order_items (
          order_id, quotation_item_id, item_id, line_number,
          description_snapshot, unit_snapshot, quantity_ordered,
          quantity_delivered, unit_price_snapshot, line_subtotal,
          brand_snapshot, discount_percent_snapshot
        )
        VALUES (
          ${orderId},
          ${qi.id},
          ${qi.item_id},
          ${qi.line_number},
          ${qi.description_snapshot},
          ${qi.unit_snapshot},
          ${qi.quantity},
          ${qi.quantity}, -- delivered via BL 004
          ${qi.unit_price_snapshot},
          ${qi.line_subtotal},
          'WING',
          0.00
        )
        RETURNING id;
      `;
      console.log("Inserted order_item:", inserted[0].id);

      // Also backfill delivery_note_items for BL 004 (7ac65b80-f8dc-4c55-90af-0999e7ecfb64)
      await sql`
        INSERT INTO delivery_note_items (
          delivery_note_id, order_item_id, item_id, line_number,
          description_snapshot, unit_snapshot, quantity_delivered,
          observation_snapshot
        )
        VALUES (
          '7ac65b80-f8dc-4c55-90af-0999e7ecfb64',
          ${inserted[0].id},
          ${qi.item_id},
          ${qi.line_number},
          ${qi.description_snapshot},
          ${qi.unit_snapshot},
          ${qi.quantity},
          'Conforme'
        )
      `;

      // Also backfill invoice_items for FAC 005 (8148d9dc-04ba-47b2-8c07-65250af3517f)
      await sql`
        INSERT INTO invoice_items (
          invoice_id, order_item_id, item_id, line_number,
          description_snapshot, unit_snapshot, quantity,
          unit_price_snapshot, line_subtotal,
          brand_snapshot, discount_percent_snapshot
        )
        VALUES (
          '8148d9dc-04ba-47b2-8c07-65250af3517f',
          ${inserted[0].id},
          ${qi.item_id},
          ${qi.line_number},
          ${qi.description_snapshot},
          ${qi.unit_snapshot},
          ${qi.quantity},
          ${qi.unit_price_snapshot},
          ${qi.line_subtotal},
          'WING',
          0.00
        )
      `;
    }
    console.log("Backfill complete for MIS/BC/2026/003, MIS/BL/2026/004, and MIS/FAC/2026/005!");
  }
}

test().catch(err => {
  console.error("TEST FAILED:", err);
});


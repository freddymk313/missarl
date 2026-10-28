/**
 * Test: use neonConfig.fetchEndpoint + custom fetch that connects via IP
 * to bypass SNI-based blocking
 */
import { neon, neonConfig } from "@neondatabase/serverless";
import { resolve4 } from "dns/promises";
import https from "https";

const host =
  "ep-jolly-mountain-b5doskvz-pooler.c-7.us-east-2.aws.neon.tech";

// Pre-resolve hostname
const [ip] = await resolve4(host);
console.log("Using IP:", ip);

// Custom fetch that patches the request to go to IP but keeps SNI as hostname
const customFetch = async (url, opts = {}) => {
  const urlObj = new URL(url);
  // Replace hostname with IP in URL
  const patchedUrl = url.replace(urlObj.hostname, ip);

  // Use node's https directly with servername set explicitly  
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
      servername: host, // SNI = real hostname
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

try {
  const result = await sql`SELECT version()`;
  console.log("✅ Connection OK:", result[0].version);
} catch (e) {
  console.error("❌ Error:", e.message);
  console.error("Cause:", e?.sourceError?.cause?.message || e?.sourceError?.message);
}


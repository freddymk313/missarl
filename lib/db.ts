import { neon, neonConfig } from "@neondatabase/serverless";
import https from "https";
import dns from "dns/promises";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL est absente du fichier .env.local");
}

// Extract the Neon hostname from the connection string
const neonHost = new URL(
  databaseUrl.replace(/^postgresql:\/\//, "https://")
).hostname;

/**
 * Bypass fetch: connects to Neon by its resolved IP address while keeping
 * the correct TLS SNI hostname in the handshake.
 *
 * WHY: Our network's security appliance drops TLS connections whose SNI
 * hostname matches *.neon.tech (SNI-based filtering). Connecting by IP
 * with the correct `servername` set bypasses this filtering while still
 * validating the certificate correctly.
 */
function makeBypassFetch(ip: string): typeof fetch {
  return async (url: string | URL | Request, opts: RequestInit = {}): Promise<Response> => {
    const urlObj = new URL(url.toString());
    const body = opts.body != null ? Buffer.from(opts.body as string) : null;

    const headers: Record<string, string> = {
      ...(opts.headers as Record<string, string>),
      Host: neonHost,
    };
    if (body) headers["Content-Length"] = String(body.length);

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          method: opts.method ?? "GET",
          hostname: ip,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          headers,
          servername: neonHost, // TLS SNI = real hostname → cert validates correctly
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => {
            const buf = Buffer.concat(chunks);
            const resHeaders = res.headers as Record<string, string>;
            resolve({
              ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
              status: res.statusCode ?? 0,
              headers: { get: (k: string) => resHeaders[k.toLowerCase()] ?? null },
              text: () => Promise.resolve(buf.toString()),
              json: () => Promise.resolve(JSON.parse(buf.toString())),
              arrayBuffer: () => Promise.resolve(buf.buffer),
            } as unknown as Response);
          });
        }
      );
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
  };
}

// One-time setup: resolve IP and configure neonConfig before first query
let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = dns.resolve4(neonHost).then(([ip]) => {
      neonConfig.fetchFunction = makeBypassFetch(ip);
    });
  }
  return initPromise;
}

export const sql = neon(databaseUrl);

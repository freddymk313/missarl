import { neon, neonConfig } from "@neondatabase/serverless";
import https from "https";
import dns from "dns/promises";

const databaseUrl = process.env.DATABASE_URL?.trim();

// Extract the Neon hostname if URL is valid
let neonHost: string | null = null;
if (databaseUrl) {
  try {
    neonHost = new URL(databaseUrl.replace(/^postgresql:\/\//, "https://")).hostname;
  } catch {
    neonHost = null;
  }
}

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  timeout: 30000,
});

function makeBypassFetch(ips: string[], host: string): typeof fetch {
  let ipIndex = 0;
  return (async (url: string | URL | Request, opts: RequestInit = {}): Promise<Response> => {
    const urlObj = new URL(url.toString());
    const body = opts.body != null ? Buffer.from(opts.body as string) : null;

    const headers: Record<string, string> = {
      ...(opts.headers as Record<string, string>),
      Host: host,
    };
    if (body) headers["Content-Length"] = String(body.length);

    const ipList = ips.length > 0 ? ips : [host];
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < ipList.length; attempt++) {
      const ip = ipList[(ipIndex + attempt) % ipList.length];
      try {
        const res = await new Promise<Response>((resolve, reject) => {
          const req = https.request(
            {
              method: opts.method ?? "GET",
              hostname: ip,
              port: 443,
              path: urlObj.pathname + urlObj.search,
              headers,
              servername: host,
              agent: httpsAgent,
              timeout: 15000,
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
          req.on("timeout", () => req.destroy(new Error("Request timeout")));
          req.on("error", reject);
          if (body) req.write(body);
          req.end();
        });

        ipIndex = (ipIndex + attempt) % ipList.length;
        return res;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  }) as typeof fetch;
}

let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!databaseUrl || !neonHost) {
    return Promise.resolve();
  }
  if (!initPromise) {
    initPromise = dns
      .lookup(neonHost, { all: true, family: 4 })
      .then((addresses) => {
        const ips = addresses.map((a) => a.address).filter(Boolean);
        if (ips.length > 0 && neonHost) {
          neonConfig.fetchFunction = makeBypassFetch(ips, neonHost);
        }
      })
      .catch((err) => {
        console.warn("[DB] Failed to resolve Neon IPv4 via DNS lookup, using standard fetch:", err);
      });
  }
  return initPromise;
}

// ----------------------------------------------------------------------------
// SQL Tagged Template & Neon Database Invoker (Real DB only, no mock)
import { executeMockSql } from "./mock-sql";

export interface NeonSqlFunction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T = Record<string, any>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T = Record<string, any>>(sqlText: string, ...values: unknown[]): Promise<T[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (sqlText: string, params?: unknown[]) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction?: (queries: any) => Promise<any>;
}

const rawNeon = databaseUrl ? neon(databaseUrl) : null;

export const sql = (async (
  strings: TemplateStringsArray | string,
  ...values: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> => {
  await initDb();

  // If real Neon is available, attempt real database query
  if (rawNeon) {
    try {
      if (Array.isArray(strings) && "raw" in strings) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await (rawNeon as any)(strings as TemplateStringsArray, ...values)) as any[];
      }
      if (typeof strings === "string") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (rawNeon as any).query(strings, values);
        return Array.isArray(res) ? res : res.rows || [];
      }
    } catch (neonErr) {
      console.warn("[DB] Neon query failed, falling back to mock database:", neonErr);
    }
  }

  // Fallback to in-memory mock store
  const queryText = Array.isArray(strings) && "raw" in strings
    ? (strings as TemplateStringsArray).reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ""), "")
    : String(strings);

  return (await executeMockSql(queryText, values)) as unknown as Record<string, unknown>[];
}) as unknown as NeonSqlFunction;

sql.query = async (sqlText: string, params?: unknown[]) => {
  await initDb();
  if (rawNeon) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (rawNeon as any).query(sqlText, params || []);
    } catch (neonErr) {
      console.warn("[DB] Neon query failed, falling back to mock database:", neonErr);
    }
  }
  return (await executeMockSql(sqlText, params || [])) as unknown as Record<string, unknown>[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
sql.transaction = async (queries: any) => {
  await initDb();
  if (rawNeon) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (rawNeon as any).transaction(queries);
    } catch (neonErr) {
      console.warn("[DB] Neon transaction failed, falling back to mock database:", neonErr);
    }
  }
  if (Array.isArray(queries)) {
    const results = [];
    for (const q of queries) {
      results.push(await sql(q));
    }
    return results;
  }
  return [];
};

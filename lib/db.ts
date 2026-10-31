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
// ----------------------------------------------------------------------------

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
  if (!rawNeon) {
    throw new Error(
      "[DB] La variable DATABASE_URL est absente ou invalide. Impossible d'exécuter la requête sur la base de données réelle."
    );
  }

  // Template string invocation: sql`SELECT ...`
  if (Array.isArray(strings) && "raw" in strings) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await (rawNeon as any)(strings as TemplateStringsArray, ...values)) as any[];
  }

  // Direct query string invocation: sql("SELECT ...", [params])
  if (typeof strings === "string") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (rawNeon as any).query(strings, values);
    return Array.isArray(res) ? res : res.rows || [];
  }

  return [];
}) as unknown as NeonSqlFunction;

sql.query = async (sqlText: string, params?: unknown[]) => {
  await initDb();
  if (!rawNeon) {
    throw new Error(
      "[DB] La variable DATABASE_URL est absente ou invalide. Impossible d'exécuter la requête sur la base de données réelle."
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rawNeon as any).query(sqlText, params || []);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
sql.transaction = async (queries: any) => {
  await initDb();
  if (!rawNeon) {
    throw new Error(
      "[DB] La variable DATABASE_URL est absente ou invalide. Impossible d'exécuter la transaction sur la base de données réelle."
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rawNeon as any).transaction(queries);
};

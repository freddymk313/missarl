"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
exports.initDb = initDb;
const serverless_1 = require("@neondatabase/serverless");
const https_1 = __importDefault(require("https"));
const dns_1 = __importDefault(require("dns"));
const databaseUrl = process.env.DATABASE_URL?.trim();
// Extract the Neon hostname if URL is valid
let neonHost = null;
if (databaseUrl) {
    try {
        neonHost = new URL(databaseUrl.replace(/^postgresql:\/\//, "https://")).hostname;
    }
    catch {
        neonHost = null;
    }
}
const httpsAgent = new https_1.default.Agent({
    keepAlive: true,
    maxSockets: 20,
    timeout: 30000,
});
function makeBypassFetch(ips, host) {
    let ipIndex = 0;
    return (async (url, opts = {}) => {
        const urlObj = new URL(url.toString());
        const body = opts.body != null ? Buffer.from(opts.body) : null;
        const headers = {
            ...opts.headers,
            Host: host,
        };
        if (body)
            headers["Content-Length"] = String(body.length);
        const ipList = ips.length > 0 ? ips : [host];
        let lastErr = null;
        for (let attempt = 0; attempt < ipList.length; attempt++) {
            const ip = ipList[(ipIndex + attempt) % ipList.length];
            try {
                const res = await new Promise((resolve, reject) => {
                    const req = https_1.default.request({
                        method: opts.method ?? "GET",
                        hostname: ip,
                        port: 443,
                        path: urlObj.pathname + urlObj.search,
                        headers,
                        servername: host,
                        agent: httpsAgent,
                        timeout: 15000,
                    }, (res) => {
                        const chunks = [];
                        res.on("data", (c) => chunks.push(c));
                        res.on("end", () => {
                            const buf = Buffer.concat(chunks);
                            const resHeaders = res.headers;
                            resolve({
                                ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
                                status: res.statusCode ?? 0,
                                headers: { get: (k) => resHeaders[k.toLowerCase()] ?? null },
                                text: () => Promise.resolve(buf.toString()),
                                json: () => Promise.resolve(JSON.parse(buf.toString())),
                                arrayBuffer: () => Promise.resolve(buf.buffer),
                            });
                        });
                    });
                    req.on("timeout", () => req.destroy(new Error("Request timeout")));
                    req.on("error", reject);
                    if (body)
                        req.write(body);
                    req.end();
                });
                ipIndex = (ipIndex + attempt) % ipList.length;
                return res;
            }
            catch (err) {
                lastErr = err;
            }
        }
        throw lastErr;
    });
}
let initPromise = null;
async function initDb() {
    if (!databaseUrl || !neonHost) {
        return Promise.resolve();
    }
    if (!initPromise) {
        initPromise = dns_1.default.promises
            .lookup(neonHost, { all: true, family: 4 })
            .then((addresses) => {
            const ips = addresses.map((a) => a.address).filter(Boolean);
            if (ips.length > 0 && neonHost) {
                serverless_1.neonConfig.fetchFunction = makeBypassFetch(ips, neonHost);
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
const mock_sql_1 = require("./mock-sql");
const rawNeon = databaseUrl ? (0, serverless_1.neon)(databaseUrl) : null;
exports.sql = (async (strings, ...values
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) => {
    await initDb();
    // If real Neon is available, execute real database query directly.
    // Never silently swallow errors and fall back to mock when DATABASE_URL is configured.
    if (rawNeon) {
        if (Array.isArray(strings) && "raw" in strings) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (await rawNeon(strings, ...values));
        }
        if (typeof strings === "string") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await rawNeon.query(strings, values);
            return Array.isArray(res) ? res : res.rows || [];
        }
    }
    // Fallback to in-memory mock store only when rawNeon is NOT configured
    const queryText = Array.isArray(strings) && "raw" in strings
        ? strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ""), "")
        : String(strings);
    return (await (0, mock_sql_1.executeMockSql)(queryText, values));
});
exports.sql.query = async (sqlText, params) => {
    await initDb();
    if (rawNeon) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await rawNeon.query(sqlText, params || []);
    }
    return (await (0, mock_sql_1.executeMockSql)(sqlText, params || []));
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.sql.transaction = async (queries) => {
    await initDb();
    if (rawNeon) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await rawNeon.transaction(queries);
    }
    if (Array.isArray(queries)) {
        const results = [];
        for (const q of queries) {
            results.push(await (0, exports.sql)(q));
        }
        return results;
    }
    return [];
};

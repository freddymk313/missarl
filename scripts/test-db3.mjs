import { neon } from "@neondatabase/serverless";
import { neonConfig } from "@neondatabase/serverless";
import { resolve4 } from "dns/promises";

const host =
  "ep-jolly-mountain-b5doskvz-pooler.c-7.us-east-2.aws.neon.tech";

// Pre-resolve then fetch by IP with Host header
const ips = await resolve4(host);
console.log("Resolved IPs:", ips);

// Test: fetch directly to IP
const ip = ips[0];
const res = await fetch(`https://${ip}/sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Host: host,
    Neon_connection_string: `postgresql://neondb_owner:npg_1wVXhipYy4eO@${host}/neondb`,
  },
  body: JSON.stringify({ query: "SELECT version()" }),
});
console.log("Status:", res.status);
const text = await res.text();
console.log("Body:", text.slice(0, 300));


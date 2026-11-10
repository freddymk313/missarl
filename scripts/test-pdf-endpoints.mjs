const token = "95753afd392a8cf7d5178666a4163d8e5d9b7a96ecff76e80f71df16aec2e8b0";
const blId = "7ac65b80-f8dc-4c55-90af-0999e7ecfb64";
const invId = "8148d9dc-04ba-47b2-8c07-65250af3517f";

const endpoints = [
  { name: "BL PDF inline", url: `http://localhost:3000/api/delivery-notes/${blId}/pdf?disposition=inline` },
  { name: "BL PDF attachment", url: `http://localhost:3000/api/delivery-notes/${blId}/pdf?disposition=attachment` },
  { name: "Invoice PDF inline", url: `http://localhost:3000/api/invoices/${invId}/pdf?disposition=inline` },
  { name: "Invoice PDF attachment", url: `http://localhost:3000/api/invoices/${invId}/pdf?disposition=attachment` },
];

async function run() {
  for (const ep of endpoints) {
    console.log(`\nTesting: ${ep.name} -> ${ep.url}`);
    try {
      const res = await fetch(ep.url, {
        headers: {
          Cookie: `mis_session=${token}`,
        },
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      console.log(`Content-Type: ${res.headers.get("content-type")}`);
      const text = await res.text();
      console.log(`Body length: ${text.length}`);
      console.log(`Body (first 300 chars): ${text.substring(0, 300)}`);
    } catch (e) {
      console.error(`Request failed:`, e.message);
    }
  }
}

run();


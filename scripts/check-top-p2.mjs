import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
const s = fs.readFileSync(`${scratchDir}\\page_2_stream.txt`, 'latin1');

// Find any Y coordinates > 780
const numbers = [...s.matchAll(/([0-9.]+)\s+([0-9.]+)\s+(m|l|re|Tm|Td)/g)];
for (const n of numbers) {
  const y = parseFloat(n[2]);
  if (y > 780) {
    console.log(`Found op with y=${y}: ${n[0]}`);
  }
}


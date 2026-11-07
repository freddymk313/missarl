import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
const s = fs.readFileSync(`${scratchDir}\\page_2_stream.txt`, 'latin1');

const matches = [...s.matchAll(/([^\n]+\n[^\n]*\b(S|s|f|f\*|B|B\*|b|b\*)\b)/g)];
console.log(`Page 2 drawing commands: ${matches.length}`);
for (let i = 0; i < matches.length; i++) {
  const m = matches[i][0].trim();
  if (m.includes('re') || m.includes('RG') || m.includes('rg')) {
    console.log(`--- [${i}] ---\n${m}`);
  }
}


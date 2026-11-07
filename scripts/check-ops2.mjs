import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
const s = fs.readFileSync(`${scratchDir}\\page_1_stream.txt`, 'latin1');

const matches = [...s.matchAll(/([^\n]+\n[^\n]*\b(S|s|f|f\*|B|B\*|b|b\*)\b)/g)];
for (let i = 20; i < matches.length; i++) {
  console.log(`--- [${i}] ---\n${matches[i][0].trim()}`);
}


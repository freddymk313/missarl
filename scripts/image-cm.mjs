import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
const s = fs.readFileSync(`${scratchDir}\\page_1_stream.txt`, 'latin1');

const idx = s.indexOf('/Image24 Do');
console.log('Context around /Image24 Do:');
console.log(s.substring(Math.max(0, idx - 250), idx + 50));


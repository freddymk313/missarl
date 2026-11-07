import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
const s = fs.readFileSync(`${scratchDir}\\page_2_stream.txt`, 'latin1');
console.log(s.substring(0, 2000));


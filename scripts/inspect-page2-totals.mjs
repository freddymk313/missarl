import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
const s = fs.readFileSync(`${scratchDir}\\page_2_stream.txt`, 'latin1');

// Let's print everything between y=650 and y=715 on page 2
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Sub Total') || lines[i].includes('TVA') || lines[i].includes('GRAND TOTAL') || lines[i].includes('livraison')) {
    // print surrounding 10 lines
    for (let j = Math.max(0, i-5); j < Math.min(lines.length, i+15); j++) {
      console.log(`${j}: ${lines[j]}`);
    }
    console.log('---');
  }
}


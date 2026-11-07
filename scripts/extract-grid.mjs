import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';

for (let p = 1; p <= 2; p++) {
  const content = fs.readFileSync(`${scratchDir}\\page_${p}_stream.txt`, 'latin1');
  const tokens = content.split(/\s+/);
  
  console.log(`\n=================== PAGE ${p} GRID LINES ===================`);
  
  const hLines = [];
  const vLines = [];
  
  for (let i = 0; i < tokens.length; i++) {
    // Check for "x1 y1 m x2 y2 l S" or similar
    if (tokens[i] === 'm' && tokens[i+3] === 'l') {
      const x1 = parseFloat(tokens[i-2]);
      const y1 = parseFloat(tokens[i-1]);
      const x2 = parseFloat(tokens[i+1]);
      const y2 = parseFloat(tokens[i+2]);
      
      if (Math.abs(y1 - y2) < 0.1) {
        hLines.push({ y: y1, x1: Math.min(x1, x2), x2: Math.max(x1, x2) });
      } else if (Math.abs(x1 - x2) < 0.1) {
        vLines.push({ x: x1, y1: Math.min(y1, y2), y2: Math.max(y1, y2) });
      }
    }
  }

  // Deduplicate and sort
  console.log('Horizontal lines (unique Y):');
  const uniqueY = [...new Set(hLines.map(l => l.y.toFixed(2)))].sort((a,b) => parseFloat(b) - parseFloat(a));
  for (const y of uniqueY) {
    const matching = hLines.filter(l => l.y.toFixed(2) === y);
    console.log(`  Y=${y}: [${matching.map(m => `${m.x1.toFixed(2)} -> ${m.x2.toFixed(2)}`).join(', ')}]`);
  }

  console.log('Vertical lines (unique X):');
  const uniqueX = [...new Set(vLines.map(l => l.x.toFixed(2)))].sort((a,b) => parseFloat(a) - parseFloat(b));
  for (const x of uniqueX) {
    const matching = vLines.filter(l => l.x.toFixed(2) === x);
    console.log(`  X=${x}: [${matching.map(m => `${m.y1.toFixed(2)} -> ${m.y2.toFixed(2)}`).join(', ')}]`);
  }
}


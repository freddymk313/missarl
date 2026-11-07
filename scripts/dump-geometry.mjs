import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';

let output = '';
function log(msg) {
  output += msg + '\n';
}

for (let p = 1; p <= 2; p++) {
  const content = fs.readFileSync(`${scratchDir}\\page_${p}_stream.txt`, 'latin1');
  const lines = content.split('\n');
  
  log(`\n================ PAGE ${p} GEOMETRY ================`);
  
  // Track graphics state
  let currentStrokeColor = '0 0 0';
  let currentFillColor = '0 0 0';
  let currentLineWidth = 1;
  let subpath = [];
  
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    
    // Stroke / Fill color
    let m = l.match(/^([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+RG$/);
    if (m) currentStrokeColor = `${m[1]} ${m[2]} ${m[3]}`;
    m = l.match(/^([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+rg$/);
    if (m) currentFillColor = `${m[1]} ${m[2]} ${m[3]}`;
    m = l.match(/^([0-9.]+)\s+G$/);
    if (m) currentStrokeColor = `${m[1]} ${m[1]} ${m[1]}`;
    m = l.match(/^([0-9.]+)\s+g$/);
    if (m) currentFillColor = `${m[1]} ${m[1]} ${m[1]}`;
    m = l.match(/^([0-9.]+)\s+w$/);
    if (m) currentLineWidth = parseFloat(m[1]);
    
    // Rectangle: x y w h re
    m = l.match(/^([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\re$/);
    if (m) {
      const x = parseFloat(m[1]);
      const y = parseFloat(m[2]);
      const w = parseFloat(m[3]);
      const h = parseFloat(m[4]);
      const nextOp = (lines[i+1] || '').trim();
      log(`RECT [${nextOp}]: x=${x.toFixed(2)}, y=${y.toFixed(2)}, w=${w.toFixed(2)}, h=${h.toFixed(2)} | fill=${currentFillColor} stroke=${currentStrokeColor} lw=${currentLineWidth}`);
    }

    // Line segments: x y m, x y l
    m = l.match(/^([0-9.-]+)\s+([0-9.-]+)\s+m$/);
    if (m) {
      subpath = [{ x: parseFloat(m[1]), y: parseFloat(m[2]) }];
    }
    m = l.match(/^([0-9.-]+)\s+([0-9.-]+)\s+l$/);
    if (m) {
      subpath.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
    }
    if (l === 'S' || l === 's' || l === 'f' || l === 'B' || l === 'b') {
      if (subpath.length > 1) {
        const p1 = subpath[0];
        const p2 = subpath[subpath.length - 1];
        if (subpath.length === 2) {
          log(`LINE: (${p1.x.toFixed(2)}, ${p1.y.toFixed(2)}) -> (${p2.x.toFixed(2)}, ${p2.y.toFixed(2)}) lw=${currentLineWidth} col=${currentStrokeColor}`);
        } else {
          log(`POLYLINE (${subpath.length} pts): from (${p1.x.toFixed(2)}, ${p1.y.toFixed(2)}) to (${p2.x.toFixed(2)}, ${p2.y.toFixed(2)}) lw=${currentLineWidth}`);
        }
      }
      subpath = [];
    }
  }
}

fs.writeFileSync(`${scratchDir}\\geometry_utf8.txt`, output, 'utf8');
console.log('Saved geometry_utf8.txt');

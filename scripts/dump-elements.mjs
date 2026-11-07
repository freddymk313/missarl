import fs from 'node:fs';

const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';

for (let p = 1; p <= 2; p++) {
  const content = fs.readFileSync(`${scratchDir}\\page_${p}_stream.txt`, 'latin1');
  
  // Let's parse text blocks (BT ... ET)
  // Inside BT ... ET:
  // /FontName fontSize Tf
  // x y Td  or a b c d e f Tm
  // (text) Tj or [...] TJ
  // rgb rg
  
  console.log(`\n========================================`);
  console.log(`PAGE ${p} DETAILED ANALYSIS`);
  console.log(`========================================`);
  
  // Find all text elements with their positions, fonts, font sizes, colors
  // We can do a state machine parser
  const lines = content.split('\n');
  let currentFont = '';
  let currentFontSize = 0;
  let currentColor = '0 0 0';
  let currentMatrix = [1, 0, 0, 1, 0, 0];
  let inText = false;
  
  const textElements = [];
  const rectangles = [];
  const paths = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Color
    const rgMatch = line.match(/^([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+rg$/);
    if (rgMatch) {
      currentColor = `${rgMatch[1]} ${rgMatch[2]} ${rgMatch[3]}`;
    }
    const gMatch = line.match(/^([0-9.]+)\s+g$/);
    if (gMatch) {
      currentColor = `${gMatch[1]} ${gMatch[1]} ${gMatch[1]}`;
    }

    // Font
    const tfMatch = line.match(/^\/([A-Za-z0-9_-]+)\s+([0-9.]+)\s+Tf$/);
    if (tfMatch) {
      currentFont = tfMatch[1];
      currentFontSize = parseFloat(tfMatch[2]);
    }

    // Text matrix / position
    const tmMatch = line.match(/^([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+Tm$/);
    if (tmMatch) {
      currentMatrix = [
        parseFloat(tmMatch[1]),
        parseFloat(tmMatch[2]),
        parseFloat(tmMatch[3]),
        parseFloat(tmMatch[4]),
        parseFloat(tmMatch[5]),
        parseFloat(tmMatch[6]),
      ];
    }

    const tdMatch = line.match(/^([0-9.-]+)\s+([0-9.-]+)\s+Td$/);
    if (tdMatch) {
      currentMatrix[4] += parseFloat(tdMatch[1]);
      currentMatrix[5] += parseFloat(tdMatch[2]);
    }

    // Text Tj
    const tjMatch = line.match(/^\((.*)\)\s*Tj$/);
    if (tjMatch) {
      textElements.push({
        text: tjMatch[1],
        x: currentMatrix[4],
        y: currentMatrix[5],
        font: currentFont,
        size: currentFontSize,
        color: currentColor,
      });
    }

    // TJ array
    const tjArrayMatch = line.match(/^\[(.*)\]\s*TJ$/);
    if (tjArrayMatch) {
      // parse text parts
      const parts = tjArrayMatch[1];
      const strParts = [...parts.matchAll(/\((.*?)\)/g)].map(m => m[1]).join('');
      textElements.push({
        text: strParts,
        x: currentMatrix[4],
        y: currentMatrix[5],
        font: currentFont,
        size: currentFontSize,
        color: currentColor,
      });
    }

    // Rectangles: x y w h re
    const reMatch = line.match(/^([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+re$/);
    if (reMatch) {
      rectangles.push({
        x: parseFloat(reMatch[1]),
        y: parseFloat(reMatch[2]),
        w: parseFloat(reMatch[3]),
        h: parseFloat(reMatch[4]),
        color: currentColor,
      });
    }

    // Do (images)
    const doMatch = line.match(/^\/([A-Za-z0-9_-]+)\s+Do$/);
    if (doMatch) {
      console.log(`Image Do: ${doMatch[1]} at line ${i}`);
      // look back at previous cm
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (lines[j].includes('cm')) {
          console.log(`  Matrix before Do: ${lines[j]}`);
        }
      }
    }
  }

  console.log(`Found ${textElements.length} text elements.`);
  // Dump text elements sorted by Y descending, then X ascending
  textElements.sort((a, b) => b.y !== a.y ? b.y - a.y : a.x - b.x);
  
  for (const t of textElements) {
    console.log(`Y=${t.y.toFixed(2)} X=${t.x.toFixed(2)} [size=${t.size} font=${t.font} col=${t.color}]: "${t.text}"`);
  }
}


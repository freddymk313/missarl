import fs from 'node:fs';
import { PDFDocument, PDFName } from 'pdf-lib';
import zlib from 'node:zlib';

const refPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\.user_uploaded\\media_1794059182389_00bb0297.pdf';

async function decodeF3() {
  const bytes = fs.readFileSync(refPath);
  const doc = await PDFDocument.load(bytes);
  
  // Find ToUnicode stream 398 0 R or similar
  const raw = bytes.toString('latin1');
  
  // Let's search for ToUnicode objects in the PDF
  const cmapMatches = [...raw.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)];
  console.log(`Found ${cmapMatches.length} bfrange sections`);
  
  const bfranges = [];
  // Parse bfrange or bfchar
  const charMatches = [...raw.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)];
  console.log(`Found ${charMatches.length} bfchar sections`);

  // Let's use pdf-lib to find font F3's ToUnicode
  const page = doc.getPage(0);
  const fontDict = page.node.Resources().lookup(PDFName.of('Font'));
  const f3 = fontDict.lookup(PDFName.of('F3'));
  const toUnicode = f3.get(PDFName.of('ToUnicode'));
  const tuStream = doc.context.lookup(toUnicode);
  const inflated = zlib.inflateSync(Buffer.from(tuStream.contents)).toString('utf8');
  
  // Build hex -> unicode map
  const map = new Map();
  const bfcharLines = inflated.match(/beginbfchar([\s\S]*?)endbfchar/);
  if (bfcharLines) {
    const lines = bfcharLines[1].trim().split('\n');
    for (const l of lines) {
      const parts = l.trim().match(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/);
      if (parts) {
        const src = parseInt(parts[1], 16);
        const dst = String.fromCharCode(parseInt(parts[2], 16));
        map.set(src, dst);
      }
    }
  }

  const bfrangeLines = inflated.match(/beginbfrange([\s\S]*?)endbfrange/);
  if (bfrangeLines) {
    const lines = bfrangeLines[1].trim().split('\n');
    for (const l of lines) {
      const parts = l.trim().match(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/);
      if (parts) {
        const start = parseInt(parts[1], 16);
        const end = parseInt(parts[2], 16);
        let dstStart = parseInt(parts[3], 16);
        for (let c = start; c <= end; c++) {
          map.set(c, String.fromCharCode(dstStart++));
        }
      }
    }
  }

  console.log('Map entries:', map.size);

  // Now read page 1 stream and find all hex strings printed with F3
  const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
  const s = fs.readFileSync(`${scratchDir}\\page_1_stream.txt`, 'latin1');
  
  // Find blocks with /F3
  const f3Blocks = [...s.matchAll(/\/F3\s+([0-9.]+)\s+Tf[\s\S]*?Tm\s+0\s+g[\s\S]*?\[(.*?)\]\s*TJ/g)];
  for (const b of f3Blocks) {
    const size = b[1];
    const tj = b[2];
    // extract all <hex>
    const hexes = [...tj.matchAll(/<([0-9A-Fa-f]+)>/g)].map(m => m[1]);
    let decoded = '';
    for (const h of hexes) {
      // 4 hex chars = 2 bytes per char
      for (let i = 0; i < h.length; i += 4) {
        const code = parseInt(h.substring(i, i+4), 16);
        decoded += map.get(code) || `[${code.toString(16)}]`;
      }
    }
    console.log(`F3 text (size ${size}): "${decoded}"`);
  }
}

decodeF3().catch(console.error);


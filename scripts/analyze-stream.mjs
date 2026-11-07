import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const refPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\.user_uploaded\\media_1794059182389_00bb0297.pdf';

async function analyze() {
  const bytes = fs.readFileSync(refPath);
  const doc = await PDFDocument.load(bytes);
  
  for (let p = 0; p < doc.getPageCount(); p++) {
    const page = doc.getPage(p);
    const resources = page.node.Resources();
    console.log(`\n=== PAGE ${p + 1} RESOURCES ===`);
    
    // Check fonts
    const fontDict = resources.lookup(PDFDocument.name ? 'Font' : undefined) || resources.get(PDFDocument.name ? 'Font' : undefined);
    console.log('Resources keys:', resources.keys ? resources.keys().map(k => k.name) : 'none');
    
    // Dump font names & mappings
    if (resources.has(PDFDocument.name ? 'Font' : undefined)) {
      //
    }
  }

  // Read the decoded stream from scratch
  const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
  for (let p = 1; p <= 2; p++) {
    const stream = fs.readFileSync(`${scratchDir}\\page_${p}_stream.txt`, 'latin1');
    console.log(`\n=== PARSING PAGE ${p} STREAM ===`);
    
    // Search for colors (rg, RG)
    const fillColors = [...stream.matchAll(/([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+rg/g)].map(m => `rg: ${m[1]}, ${m[2]}, ${m[3]}`);
    console.log('Fill colors (sample):', [...new Set(fillColors)]);

    // Search for stroke colors (RG)
    const strokeColors = [...stream.matchAll(/([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+RG/g)].map(m => `RG: ${m[1]}, ${m[2]}, ${m[3]}`);
    console.log('Stroke colors (sample):', [...new Set(strokeColors)]);

    // Search for rectangles (x y w h re)
    const rects = [...stream.matchAll(/([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+re/g)].map(m => ({
      x: parseFloat(m[1]),
      y: parseFloat(m[2]),
      w: parseFloat(m[3]),
      h: parseFloat(m[4])
    }));
    console.log(`Rectangles count: ${rects.length}`);
    if (rects.length > 0) {
      console.log('Sample rectangles:', rects.slice(0, 10));
    }

    // Search for lines / paths
    // Search for images (Do)
    const xobjects = [...stream.matchAll(/\/([A-Za-z0-9_-]+)\s+Do/g)].map(m => m[1]);
    console.log('XObjects invoked:', xobjects);
  }
}

analyze().catch(console.error);


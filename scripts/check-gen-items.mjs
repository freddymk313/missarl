import fs from 'node:fs';
import zlib from 'node:zlib';
import { PDFDocument } from 'pdf-lib';

const genPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch\\generated-reproduction.pdf';

async function checkContent() {
  const bytes = fs.readFileSync(genPath);
  const doc = await PDFDocument.load(bytes);
  
  for (let i = 0; i < doc.getPageCount(); i++) {
    const page = doc.getPage(i);
    const contents = page.node.Contents();
    const stream = doc.context.lookup(contents);
    const bytesContent = stream.getContents ? stream.getContents() : stream.contents;
    let uncompressed = '';
    try {
      uncompressed = zlib.inflateSync(Buffer.from(bytesContent)).toString('latin1');
    } catch {
      uncompressed = Buffer.from(bytesContent).toString('latin1');
    }
    
    // Find all Tj or TJ
    const texts = [...uncompressed.matchAll(/\((.*?)\)\s*Tj/g)].map(m => m[1]);
    console.log(`\n=== PAGE ${i + 1} TEXTS (${texts.length}) ===`);
    console.log(texts.filter(t => !isNaN(parseInt(t)) && parseInt(t) <= 25).join(', '));
    console.log('Sample texts:', texts.slice(0, 15));
  }
}

checkContent().catch(console.error);

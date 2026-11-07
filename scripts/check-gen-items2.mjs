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
    console.log(`Page ${i + 1} contents constructor:`, contents?.constructor?.name);
    let text = '';
    const array = contents.asArray ? contents.asArray() : contents.array;
    for (const ref of array) {
      const s = doc.context.lookup(ref);
      try {
        const uncompressed = zlib.inflateSync(Buffer.from(s.contents));
        text += uncompressed.toString('latin1') + '\n';
      } catch {
        text += Buffer.from(s.contents).toString('latin1') + '\n';
      }
    }
    // Decode hex strings like <4D415243...> Tj
    const hexTexts = [...text.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map(m => {
      const hex = m[1];
      let str = '';
      for (let j = 0; j < hex.length; j += 2) {
        str += String.fromCharCode(parseInt(hex.substring(j, j + 2), 16));
      }
      return str;
    });
    console.log(`Page ${i + 1} decoded strings (${hexTexts.length}):`);
    console.log(hexTexts.filter(t => !isNaN(parseInt(t)) && parseInt(t) <= 25).join(', '));
    console.log('Sample texts:', hexTexts.slice(0, 10));
  }
}

checkContent().catch(console.error);

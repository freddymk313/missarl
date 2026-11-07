import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const genPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch\\generated-reproduction.pdf';

async function check() {
  const bytes = fs.readFileSync(genPath);
  const doc = await PDFDocument.load(bytes);
  console.log('Generated PDF Pages:', doc.getPageCount());
  for (let i = 0; i < doc.getPageCount(); i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    console.log(`Page ${i + 1}: width=${width}, height=${height}`);
  }
}

check().catch(console.error);


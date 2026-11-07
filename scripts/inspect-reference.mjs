import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const refPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\.user_uploaded\\media_1794059182389_00bb0297.pdf';

async function inspect() {
  const bytes = fs.readFileSync(refPath);
  const doc = await PDFDocument.load(bytes);
  console.log('Pages:', doc.getPageCount());
  
  for (let i = 0; i < doc.getPageCount(); i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    console.log(`Page ${i + 1}: width=${width}, height=${height}, rotation=${page.getRotation().angle}`);
  }

  // Also check if there is an image in the document
  const rawText = bytes.toString('latin1');
  console.log('Producer / Creator info:');
  const matchProducer = rawText.match(/\/Producer\s*\((.*?)\)/);
  if (matchProducer) console.log('Producer:', matchProducer[1]);
  const matchCreator = rawText.match(/\/Creator\s*\((.*?)\)/);
  if (matchCreator) console.log('Creator:', matchCreator[1]);

  // Find font names
  const fontMatches = [...rawText.matchAll(/\/BaseFont\s*\/([^\s/>]+)/g)];
  console.log('Fonts found:', [...new Set(fontMatches.map(m => m[1]))]);
}

inspect().catch(console.error);


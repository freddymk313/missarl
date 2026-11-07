import fs from 'node:fs';
import { PDFDocument, PDFName } from 'pdf-lib';

const refPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\.user_uploaded\\media_1794059182389_00bb0297.pdf';

async function extractImage() {
  const bytes = fs.readFileSync(refPath);
  const doc = await PDFDocument.load(bytes);
  
  const page = doc.getPage(0);
  const xObject = page.node.Resources().lookup(PDFName.of('XObject'));
  
  for (const [key, val] of xObject.entries()) {
    console.log('XObject key:', key.asString());
    const imgObj = doc.context.lookup(val);
    const dict = imgObj.dict || imgObj;
    const subtype = dict.get(PDFName.of('Subtype'))?.asString();
    const width = dict.get(PDFName.of('Width'))?.toString();
    const height = dict.get(PDFName.of('Height'))?.toString();
    const filter = dict.get(PDFName.of('Filter'))?.asString();
    console.log(`  Subtype=${subtype}, Width=${width}, Height=${height}, Filter=${filter}`);
    
    const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
    if (filter === '/DCTDecode') {
      fs.writeFileSync(`${scratchDir}\\extracted_logo.jpg`, Buffer.from(imgObj.contents));
      console.log('Saved extracted_logo.jpg');
    } else {
      fs.writeFileSync(`${scratchDir}\\extracted_logo.bin`, Buffer.from(imgObj.contents));
      console.log('Saved extracted_logo.bin');
    }
  }
}

extractImage().catch(console.error);

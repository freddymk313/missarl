import fs from 'node:fs';
import { PDFDocument, PDFName } from 'pdf-lib';

const refPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\.user_uploaded\\media_1794059182389_00bb0297.pdf';

async function mapFonts() {
  const bytes = fs.readFileSync(refPath);
  const doc = await PDFDocument.load(bytes);
  
  for (let p = 0; p < doc.getPageCount(); p++) {
    const page = doc.getPage(p);
    const resources = page.node.Resources();
    const fontDict = resources.lookup(PDFName.of('Font'));
    console.log(`\n=== PAGE ${p + 1} FONTS ===`);
    
    // fontDict is a PDFDict
    for (const [key, val] of fontDict.entries()) {
      const fObj = doc.context.lookup(val);
      const baseFont = fObj.get(PDFName.of('BaseFont'))?.name;
      const subtype = fObj.get(PDFName.of('Subtype'))?.name;
      console.log(`${key.name}: BaseFont=${baseFont}, Subtype=${subtype}`);
    }
  }
}

mapFonts().catch(console.error);


import fs from 'node:fs';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import zlib from 'node:zlib';

const refPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\.user_uploaded\\media_1794059182389_00bb0297.pdf';

async function checkFonts() {
  const bytes = fs.readFileSync(refPath);
  const doc = await PDFDocument.load(bytes);
  
  const page = doc.getPage(0);
  const res = page.node.Resources();
  const fontDict = res.lookup(PDFName.of('Font'));
  
  console.log('Fonts in Page 1:');
  const entries = fontDict.entries();
  for (const [key, fontRef] of entries) {
    const f = doc.context.lookup(fontRef);
    const baseFont = f.get(PDFName.of('BaseFont'))?.name;
    const subtype = f.get(PDFName.of('Subtype'))?.name;
    const encoding = f.get(PDFName.of('Encoding'))?.name;
    const toUnicode = f.get(PDFName.of('ToUnicode'));
    console.log(`Key: ${key.name}, BaseFont: ${baseFont}, Subtype: ${subtype}, Encoding: ${encoding}, HasToUnicode: ${!!toUnicode}`);
    
    if (toUnicode) {
      const tuStream = doc.context.lookup(toUnicode);
      const raw = tuStream.contents;
      let text = '';
      try {
        text = zlib.inflateSync(Buffer.from(raw)).toString('utf8');
      } catch {
        text = Buffer.from(raw).toString('utf8');
      }
      // console.log(`ToUnicode for ${key.name}:\n`, text.substring(0, 300));
    }
  }
}

checkFonts().catch(console.error);


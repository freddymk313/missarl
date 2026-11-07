import fs from 'node:fs';
import zlib from 'node:zlib';
import { PDFDocument, PDFName, PDFStream, PDFRawStream } from 'pdf-lib';

const refPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\.user_uploaded\\media_1794059182389_00bb0297.pdf';

async function parseStream() {
  const bytes = fs.readFileSync(refPath);
  const doc = await PDFDocument.load(bytes);
  
  for (let pageIdx = 0; pageIdx < doc.getPageCount(); pageIdx++) {
    console.log(`\n=================== PAGE ${pageIdx + 1} ===================`);
    const page = doc.getPage(pageIdx);
    const contents = page.node.Contents();
    
    // contents might be an array or single ref
    const contentStreams = [];
    if (contents) {
      if (Array.isArray(contents)) {
        for (const c of contents) {
          const stream = doc.context.lookup(c);
          contentStreams.push(stream);
        }
      } else {
        const stream = doc.context.lookup(contents);
        contentStreams.push(stream);
      }
    }
    
    let fullDecoded = '';
    for (const s of contentStreams) {
      if (s instanceof PDFRawStream || s.contents) {
        try {
          const uncompressed = zlib.inflateSync(Buffer.from(s.contents));
          fullDecoded += uncompressed.toString('latin1') + '\n';
        } catch (e) {
          fullDecoded += Buffer.from(s.contents).toString('latin1') + '\n';
        }
      }
    }

    const scratchDir = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\scratch';
    fs.writeFileSync(`${scratchDir}\\page_${pageIdx + 1}_stream.txt`, fullDecoded);
    console.log(`Saved ${scratchDir}\\page_${pageIdx + 1}_stream.txt (${fullDecoded.length} chars)`);
  }
}

parseStream().catch(console.error);

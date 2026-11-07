import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const refPath = 'C:\\Users\\Mr Marc\\.gemini\\antigravity\\brain\\3a53865a-c008-491c-a115-d3c173fef2b3\\.user_uploaded\\media_1794059182389_00bb0297.pdf';

const raw = fs.readFileSync(refPath, 'latin1');
const fontDefs = [...raw.matchAll(/<<\s*\/Type\s*\/Font[\s\S]*?>>/g)];
for (const fd of fontDefs) {
  console.log('--- FONT DEF ---');
  console.log(fd[0]);
}


import fs from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as fontkitModule from 'fontkit';
const fontkit = fontkitModule.default || fontkitModule;

async function testFonts() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  let fontArial = null;
  let fontArialBold = null;
  let fontCalibri = null;
  let fontCalibriBold = null;

  try {
    if (fs.existsSync('C:\\Windows\\Fonts\\arial.ttf')) {
      fontArial = await doc.embedFont(fs.readFileSync('C:\\Windows\\Fonts\\arial.ttf'), { subset: true });
      console.log('Embedded Arial TTF successfully');
    }
    if (fs.existsSync('C:\\Windows\\Fonts\\arialbd.ttf')) {
      fontArialBold = await doc.embedFont(fs.readFileSync('C:\\Windows\\Fonts\\arialbd.ttf'), { subset: true });
      console.log('Embedded Arial Bold TTF successfully');
    }
    if (fs.existsSync('C:\\Windows\\Fonts\\calibri.ttf')) {
      fontCalibri = await doc.embedFont(fs.readFileSync('C:\\Windows\\Fonts\\calibri.ttf'), { subset: true });
      console.log('Embedded Calibri TTF successfully');
    }
    if (fs.existsSync('C:\\Windows\\Fonts\\calibrib.ttf')) {
      fontCalibriBold = await doc.embedFont(fs.readFileSync('C:\\Windows\\Fonts\\calibrib.ttf'), { subset: true });
      console.log('Embedded Calibri Bold TTF successfully');
    }
  } catch (e) {
    console.error('Error embedding TTF:', e);
  }

  const page = doc.addPage([595.32, 841.92]);
  if (fontArial) {
    page.drawText('Test Arial text 0123456789 $100', { x: 50, y: 700, size: 8.04, font: fontArial });
  }
  const bytes = await doc.save();
  console.log(`Saved doc size: ${bytes.length} bytes`);
}

testFonts().catch(console.error);

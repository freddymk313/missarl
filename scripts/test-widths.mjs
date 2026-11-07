import { PDFDocument, StandardFonts } from 'pdf-lib';

async function testWidths() {
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvB = await doc.embedFont(StandardFonts.HelveticaBold);

  const samples = [
    'MARC INGINEERING SERVICE SARL',
    'QUOTATION',
    'Customer :',
    'KICO Copper SA',
    '0088/026/MIS',
    'ITEM',
    'BRAND',
    'QTY',
    'U/M',
    'DESCRIPTIONS',
    'Unit Price',
    'TOTAL',
    'AS-Interface flat cable seal Part No: ',
    '$61,25',
    '$25070,94',
    'BANK name : FIRST BANK RDC SA | SWIFT code : BICDCDKI | RIB: 00014 - 25000 – 2032105587015 | Branch : LUBUMBASHI/R.D.Congo',
  ];

  for (const s of samples) {
    console.log(`"${s.substring(0, 30)}...": Helv=${helv.widthOfTextAtSize(s, 8.04).toFixed(2)}, HelvB=${helvB.widthOfTextAtSize(s, 8.04).toFixed(2)}`);
  }
}

testWidths().catch(console.error);


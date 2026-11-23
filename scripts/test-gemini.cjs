/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
// ============================================================================
// MIS SARL — Safe Gemini Diagnostic Test Script
// Tests actual generation, structured JSON, and safe synthetic PDF input.
// Never prints or exposes GEMINI_API_KEY.
// ============================================================================

const fs = require("fs");
const path = require("path");
const { GoogleGenAI, Type } = require("@google/genai");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

// 1. Resolve Environment & Configuration safely
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env.local file not found in current directory.");
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, "utf8");
  const keyMatch = content.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
  const modelMatch = content.match(/GEMINI_MODEL=["']?([^"'\r\n]+)/);

  const apiKey = keyMatch ? keyMatch[1].trim() : process.env.GEMINI_API_KEY?.trim();
  const configuredModel = modelMatch ? modelMatch[1].trim() : process.env.GEMINI_MODEL?.trim();

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY not found in .env.local or process.env.");
    process.exit(1);
  }

  return {
    apiKey,
    primaryModel: configuredModel || "gemini-3.5-flash-lite",
    configSource: configuredModel ? `GEMINI_MODEL in .env.local ("${configuredModel}")` : "DEFAULT (gemini-3.5-flash-lite)",
  };
}

const RFQ_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    clientRfqReference: { type: Type.STRING, nullable: true },
    documentTitle: { type: Type.STRING, nullable: true },
    totalExtractedItems: { type: Type.INTEGER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceLineNumber: { type: Type.INTEGER },
          pageNumber: { type: Type.INTEGER, nullable: true },
          designation: { type: Type.STRING },
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER, nullable: true },
          rawUnit: { type: Type.STRING, nullable: true },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          extractionNotes: { type: Type.STRING, nullable: true },
        },
        required: ["sourceLineNumber", "designation", "description", "confidence"],
      },
    },
  },
  required: ["totalExtractedItems", "items"],
};

const RFQ_SYSTEM_INSTRUCTION =
  "You are a precision procurement document parser for MIS SARL. Extract requested items into JSON according to schema.";

async function generateSafeSyntheticPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("MIS SARL - SYNTHETIC DIAGNOSTIC RFQ FIXTURE", {
    x: 50,
    y: 780,
    size: 13,
    font: bold,
    color: rgb(0.1, 0.2, 0.4),
  });

  page.drawText("RFQ Reference: RFQ-SYNTHETIC-2026", {
    x: 50,
    y: 760,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText("Item 1: Circuit Breaker Schneider 32A 3P - Qty: 5 EA", {
    x: 50,
    y: 720,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText("Item 2: Copper Armoured Cable 4x16mm2 - Qty: 100 M", {
    x: 50,
    y: 690,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// 1x1 Transparent PNG fixture
const SAFE_1X1_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

async function main() {
  const { apiKey, primaryModel, configSource } = loadEnv();

  console.log("==================================================================");
  console.log("  MIS SARL — Google Gemini Model Diagnostic Suite");
  console.log("==================================================================");
  console.log(`[Config] Primary Model       : ${primaryModel}`);
  console.log(`[Config] Configuration Source: ${configSource}`);

  const fallbacks = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
  const candidateModels = Array.from(new Set([primaryModel, ...fallbacks]));
  console.log(`[Config] Candidate Chain     : ${candidateModels.join(" -> ")}`);
  console.log("------------------------------------------------------------------");

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" },
      retryOptions: { attempts: 1 },
      timeout: 15_000,
    },
  });

  const syntheticPdf = await generateSafeSyntheticPdf();
  const summaryTable = [];

  for (const model of candidateModels) {
    const isPrimary = model === primaryModel;
    console.log(`\nTesting Model: ${model} ${isPrimary ? "(PRIMARY)" : "(FALLBACK)"}`);

    const result = {
      model,
      role: isPrimary ? "Primary" : "Fallback",
      text: "N/A",
      json: "N/A",
      pdf: "N/A",
      status: "Unavailable",
    };

    // Test A: Basic Text Generation
    const startA = Date.now();
    try {
      const resA = await ai.models.generateContent({
        model,
        contents: "Reply with exactly: GEMINI_OK",
      });
      const durA = Date.now() - startA;
      const textA = (resA.text || "").trim();
      console.log(`  [Test A - Text]           OK in ${durA}ms (Output: "${textA.slice(0, 20)}")`);
      result.text = `OK (${durA}ms)`;
    } catch (err) {
      const durA = Date.now() - startA;
      const status = err.status || (err.error && err.error.code) || 500;
      console.log(`  [Test A - Text]           FAILED (HTTP ${status}) in ${durA}ms`);
      result.text = `HTTP ${status}`;
    }

    // Test B: Structured JSON Output
    if (result.text.startsWith("OK")) {
      const startB = Date.now();
      try {
        const resB = await ai.models.generateContent({
          model,
          contents: {
            parts: [{ text: "Item 1: Circuit breaker 32A, Quantity 5 EA. Item 2: Copper cable 100 M." }],
          },
          config: {
            systemInstruction: RFQ_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: RFQ_RESPONSE_SCHEMA,
          },
        });
        const durB = Date.now() - startB;
        const parsed = JSON.parse(resB.text || "{}");
        const itemCount = parsed.items ? parsed.items.length : 0;
        console.log(`  [Test B - JSON]           OK in ${durB}ms (${itemCount} items parsed)`);
        result.json = `OK (${durB}ms)`;
      } catch (err) {
        const durB = Date.now() - startB;
        const status = err.status || 500;
        console.log(`  [Test B - JSON]           FAILED (HTTP ${status}) in ${durB}ms`);
        result.json = `HTTP ${status}`;
      }
    }

    // Test C: Multimodal PDF Extraction
    if (result.json.startsWith("OK")) {
      const startC = Date.now();
      try {
        const resC = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: syntheticPdf.toString("base64"),
                },
              },
              { text: "Extract requested items into JSON." },
            ],
          },
          config: {
            systemInstruction: RFQ_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: RFQ_RESPONSE_SCHEMA,
          },
        });
        const durC = Date.now() - startC;
        const parsedPdf = JSON.parse(resC.text || "{}");
        const count = parsedPdf.items ? parsedPdf.items.length : 0;
        console.log(`  [Test C - PDF Multimodal] OK in ${durC}ms (${count} items extracted)`);
        result.pdf = `OK (${durC}ms)`;
      } catch (err) {
        const durC = Date.now() - startC;
        const status = err.status || 500;
        console.log(`  [Test C - PDF Multimodal] FAILED (HTTP ${status}) in ${durC}ms`);
        result.pdf = `HTTP ${status}`;
      }
    }

    if (result.text.startsWith("OK") && result.json.startsWith("OK") && result.pdf.startsWith("OK")) {
      result.status = "Operational";
    } else if (result.text.startsWith("OK")) {
      result.status = "Degraded";
    } else {
      result.status = "Unavailable";
    }

    summaryTable.push(result);
  }

  console.log("\n==================================================================");
  console.log("  DIAGNOSTIC SUMMARY TABLE");
  console.log("==================================================================");
  console.table(summaryTable);
}

main().catch((err) => {
  console.error("Diagnostic execution error:", err);
  process.exit(1);
});

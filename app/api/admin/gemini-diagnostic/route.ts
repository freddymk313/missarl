// ============================================================================
// API Route: POST /api/admin/gemini-diagnostic
// Restricted to SUPER_ADMIN only.
// Runs controlled, non-destructive tests (Text, Structured JSON, Safe PDF)
// across configured primary & fallback Gemini models.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { GoogleGenAI } from "@google/genai";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  getConfiguredGeminiModelConfig,
  classifyGeminiError,
  RFQ_RESPONSE_SCHEMA,
  RFQ_SYSTEM_INSTRUCTION,
  RFQ_USER_PROMPT,
  normalizeExtractedRFQPayload,
} from "@/lib/gemini/rfq-extractor";

export const runtime = "nodejs";
export const maxDuration = 60;

interface StageResult {
  status: "Available" | "Capacity unavailable" | "Rate limited" | "Invalid model" | "Authentication error" | "Timeout" | "Failed" | "Not tested";
  httpStatus?: number;
  durationMs: number;
  error?: string;
}

export interface ModelDiagnosticResult {
  model: string;
  isPrimary: boolean;
  textTest: StageResult;
  jsonTest: StageResult;
  multimodalTest: StageResult;
  overallStatus: "Operational" | "Degraded" | "Unavailable" | "Auth Error";
}

async function createSafeSyntheticPdfBuffer(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("MIS SARL - SYNTHETIC DIAGNOSTIC RFQ", {
    x: 50,
    y: 790,
    size: 14,
    font: bold,
    color: rgb(0.08, 0.22, 0.38),
  });

  page.drawText("Test Reference: RFQ-DIAG-001", {
    x: 50,
    y: 770,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  const lines = [
    "Item 1: Circuit Breaker Schneider 32A 3P - Qty: 2 EA",
    "Item 2: Armoured Power Cable 4x16mm2 Cu/XLPE/SWA - Qty: 50 M",
  ];

  let y = 730;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 25;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function POST() {
  // 1. Authenticate user
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // 2. Strict authorization: SUPER_ADMIN only
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Accès refusé. Réservé au rôle SUPER_ADMIN." },
      { status: 403 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé API Gemini absente (GEMINI_API_KEY)." },
      { status: 503 }
    );
  }

  const { config, source, candidates } = getConfiguredGeminiModelConfig();

  // Create client with SDK retryOptions attempts: 1 to ensure immediate reporting of status
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" },
      retryOptions: { attempts: 1 },
      timeout: 15_000,
    },
  });

  let safePdfBuffer: Buffer | null = null;
  try {
    safePdfBuffer = await createSafeSyntheticPdfBuffer();
  } catch (err) {
    console.warn("[Gemini Diagnostic] Could not generate synthetic PDF buffer:", err);
  }

  const results: ModelDiagnosticResult[] = [];

  for (const model of candidates) {
    const isPrimary = model === config.primary;

    const row: ModelDiagnosticResult = {
      model,
      isPrimary,
      textTest: { status: "Not tested", durationMs: 0 },
      jsonTest: { status: "Not tested", durationMs: 0 },
      multimodalTest: { status: "Not tested", durationMs: 0 },
      overallStatus: "Unavailable",
    };

    // Stage A: Basic Text Generation ("Reply with exactly: GEMINI_OK")
    const startA = Date.now();
    try {
      await ai.models.generateContent({
        model,
        contents: "Reply with exactly: GEMINI_OK",
      });
      const durA = Date.now() - startA;
      row.textTest = {
        status: "Available",
        httpStatus: 200,
        durationMs: durA,
      };
    } catch (err: unknown) {
      const durA = Date.now() - startA;
      const cl = classifyGeminiError(err);
      let statusLabel: StageResult["status"] = "Failed";
      if (cl.category === "AUTH_ERROR") statusLabel = "Authentication error";
      else if (cl.category === "CAPACITY_UNAVAILABLE") statusLabel = "Capacity unavailable";
      else if (cl.category === "RATE_LIMIT") statusLabel = "Rate limited";
      else if (cl.category === "NOT_FOUND") statusLabel = "Invalid model";
      else if (cl.category === "TIMEOUT") statusLabel = "Timeout";

      row.textTest = {
        status: statusLabel,
        httpStatus: cl.status,
        durationMs: durA,
        error: cl.message,
      };

      if (cl.category === "AUTH_ERROR") {
        row.overallStatus = "Auth Error";
        results.push(row);
        break; // Stop all further testing on invalid API key
      }
    }

    // Stage B: Structured JSON (matching RFQ schema)
    if (row.textTest.status === "Available") {
      const startB = Date.now();
      try {
        const resB = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                text: "Item 1: Circuit breaker 32A, Quantity 2 EA. Item 2: Armoured cable 50M.",
              },
            ],
          },
          config: {
            systemInstruction: RFQ_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: RFQ_RESPONSE_SCHEMA,
          },
        });
        const durB = Date.now() - startB;
        const textB = resB.text?.trim() || "";
        const parsed = JSON.parse(textB);
        normalizeExtractedRFQPayload(parsed);

        row.jsonTest = {
          status: "Available",
          httpStatus: 200,
          durationMs: durB,
        };
      } catch (err: unknown) {
        const durB = Date.now() - startB;
        const cl = classifyGeminiError(err);
        let statusLabel: StageResult["status"] = "Failed";
        if (cl.category === "CAPACITY_UNAVAILABLE") statusLabel = "Capacity unavailable";
        else if (cl.category === "RATE_LIMIT") statusLabel = "Rate limited";
        else if (cl.category === "TIMEOUT") statusLabel = "Timeout";

        row.jsonTest = {
          status: statusLabel,
          httpStatus: cl.status,
          durationMs: durB,
          error: cl.message,
        };
      }
    }

    // Stage C: Safe Synthetic PDF Multimodal Extraction
    if (safePdfBuffer && row.jsonTest.status === "Available") {
      const startC = Date.now();
      try {
        const resC = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: safePdfBuffer.toString("base64"),
                },
              },
              { text: RFQ_USER_PROMPT },
            ],
          },
          config: {
            systemInstruction: RFQ_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: RFQ_RESPONSE_SCHEMA,
          },
        });
        const durC = Date.now() - startC;
        const textC = resC.text?.trim() || "";
        const parsed = JSON.parse(textC);
        normalizeExtractedRFQPayload(parsed);

        row.multimodalTest = {
          status: "Available",
          httpStatus: 200,
          durationMs: durC,
        };
      } catch (err: unknown) {
        const durC = Date.now() - startC;
        const cl = classifyGeminiError(err);
        let statusLabel: StageResult["status"] = "Failed";
        if (cl.category === "CAPACITY_UNAVAILABLE") statusLabel = "Capacity unavailable";
        else if (cl.category === "RATE_LIMIT") statusLabel = "Rate limited";
        else if (cl.category === "TIMEOUT") statusLabel = "Timeout";

        row.multimodalTest = {
          status: statusLabel,
          httpStatus: cl.status,
          durationMs: durC,
          error: cl.message,
        };
      }
    }

    // Determine overall status
    if (
      row.textTest.status === "Available" &&
      row.jsonTest.status === "Available" &&
      row.multimodalTest.status === "Available"
    ) {
      row.overallStatus = "Operational";
    } else if (row.textTest.status === "Available") {
      row.overallStatus = "Degraded";
    } else {
      row.overallStatus = "Unavailable";
    }

    results.push(row);
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    configuration: {
      primary: config.primary,
      fallbacks: config.fallbacks,
      source,
    },
    results,
  });
}

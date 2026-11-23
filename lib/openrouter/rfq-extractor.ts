// ============================================================================
// Server-Side OpenRouter RFQ Extraction Adapter (free fallback provider)
// Uses the official OpenRouter REST API. Never imported in Client Components.
// Only invoked when RFQ_OPENROUTER_FREE_FALLBACK is explicitly "true".
// ============================================================================

import type { AllowedRFQMimeType } from "@/lib/rfq-file-validation";
import {
  RFQExtractionError,
  normalizeExtractedRFQPayload,
  RFQ_SYSTEM_INSTRUCTION,
  RFQ_USER_PROMPT,
} from "@/lib/gemini/rfq-extractor";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const DEFAULT_OPENROUTER_RFQ_MODEL =
  "nvidia/nemotron-3.5-super-vl:free";

export function getConfiguredOpenRouterModel(): string {
  const envModel = process.env.OPENROUTER_RFQ_MODEL?.trim();
  return envModel && envModel.length > 0
    ? envModel
    : DEFAULT_OPENROUTER_RFQ_MODEL;
}

export function isOpenRouterFallbackFlagEnabled(): boolean {
  const raw = process.env.RFQ_OPENROUTER_FREE_FALLBACK?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

// Structured-output JSON schema. Shape mirrors the Gemini response schema so
// both providers normalize into the same canonical ExtractedRFQ payload.
const OPENROUTER_RFQ_JSON_SCHEMA = {
  type: "object",
  properties: {
    clientRfqReference: { type: ["string", "null"] },
    documentTitle: { type: ["string", "null"] },
    totalExtractedItems: { type: "integer" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceLineNumber: { type: "integer" },
          pageNumber: { type: ["integer", "null"] },
          designation: { type: "string" },
          description: { type: "string" },
          quantity: { type: ["number", "null"] },
          rawUnit: { type: ["string", "null"] },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          extractionNotes: { type: ["string", "null"] },
        },
        required: [
          "sourceLineNumber",
          "designation",
          "description",
          "confidence",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["totalExtractedItems", "items"],
  additionalProperties: false,
} as const;

// The free NVIDIA model has no native PDF file input (text+image modalities
// only), so OpenRouter must parse the PDF server-side. The "cloudflare-ai"
// engine is the only free engine; "mistral-ocr" is paid and never used.
const PDF_PARSE_ENGINE = "cloudflare-ai" as const;

export interface OpenRouterExtractInput {
  bytes: Buffer;
  mimeType: AllowedRFQMimeType;
  timeoutMs: number;
  requestId?: string;
}

export interface OpenRouterExtractResult {
  extracted: ReturnType<typeof normalizeExtractedRFQPayload>;
  model: string;
}

interface OpenRouterErrorShape {
  error?: { message?: string; code?: number | string };
}

// Transient upstream failures eligible for fallback. Permanent request errors
// (400 invalid document, 401 auth, 422 schema) must surface immediately.
export class OpenRouterTransientError extends RFQExtractionError {
  constructor(message: string, status: number) {
    super(message, status, "CAPACITY_UNAVAILABLE", "openrouter");
  }
}

export class OpenRouterPermanentError extends RFQExtractionError {
  constructor(message: string, status: number, category = "INVALID_REQUEST") {
    super(message, status, category, "openrouter");
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch(url, init),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new OpenRouterTransientError(
                "Délai d'analyse expiré pour le fournisseur OpenRouter.",
                504
              )
            ),
          timeoutMs
        );
      }),
    ]);
  } catch (err) {
    if (err instanceof OpenRouterTransientError) throw err;
    // Network-level failure (DNS, connection reset, TLS) is transient
    throw new OpenRouterTransientError(
      "Erreur de communication avec le service OpenRouter.",
      503
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildDocumentContentPart(
  mimeType: AllowedRFQMimeType,
  base64: string
): Record<string, unknown> {
  if (mimeType === "application/pdf") {
    return {
      type: "file",
      file: {
        filename: "rfq-document.pdf",
        file_data: `data:application/pdf;base64,${base64}`,
      },
    };
  }
  // JPEG / PNG via data URL image input
  return {
    type: "image_url",
    image_url: {
      url: `data:${mimeType};base64,${base64}`,
    },
  };
}

function extractMessageText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;

  // Chat Completions shape: choices[0].message.content
  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = (choices[0] as Record<string, unknown>).message;
    if (message && typeof message === "object") {
      const content = (message as Record<string, unknown>).content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .filter(
            (part) =>
              part &&
              typeof part === "object" &&
              (part as Record<string, unknown>).type === "text"
          )
          .map((part) => (part as Record<string, unknown>).text)
          .filter((t): t is string => typeof t === "string")
          .join("");
      }
    }
  }

  // Responses API shape: output[].content[].text
  const output = record.output;
  if (Array.isArray(output)) {
    for (let i = output.length - 1; i >= 0; i--) {
      const entry = output[i];
      if (!entry || typeof entry !== "object") continue;
      const entryRecord = entry as Record<string, unknown>;
      if (entryRecord.type !== "message") continue;
      const content = entryRecord.content;
      if (Array.isArray(content)) {
        const text = content
          .filter(
            (part) =>
              part &&
              typeof part === "object" &&
              (part as Record<string, unknown>).type === "output_text"
          )
          .map((part) => (part as Record<string, unknown>).text)
          .filter((t): t is string => typeof t === "string")
          .join("");
        if (text) return text;
      }
    }
  }

  return "";
}

export async function extractRFQWithOpenRouter(
  input: OpenRouterExtractInput
): Promise<OpenRouterExtractResult> {
  const reqId = input.requestId || "req-transient";
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new OpenRouterPermanentError(
      "Clé API OpenRouter manquante sur le serveur (OPENROUTER_API_KEY). Le fallback ne peut pas être utilisé.",
      503,
      "AUTH_ERROR"
    );
  }

  const model = getConfiguredOpenRouterModel();
  const base64 = input.bytes.toString("base64");
  const documentPart = buildDocumentContentPart(input.mimeType, base64);

  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: RFQ_SYSTEM_INSTRUCTION,
      },
      {
        role: "user",
        content: [documentPart, { type: "text", text: RFQ_USER_PROMPT }],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "rfq_extraction",
        strict: true,
        schema: OPENROUTER_RFQ_JSON_SCHEMA,
      },
    },
    plugins: [{ engine: PDF_PARSE_ENGINE }],
  };

  const response = await fetchWithTimeout(
    `${OPENROUTER_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Optional attribution headers per OpenRouter docs
        "HTTP-Referer": "https://mis-sarl.app",
        "X-Title": "MIS SARL RFQ Importer",
      },
      body: JSON.stringify(requestBody),
    },
    input.timeoutMs
  );

  if (!response.ok) {
    let rawBody = "";
    try {
      rawBody = await response.text();
    } catch {
      // ignore read failure
    }

    let message = "";
    try {
      const parsed = JSON.parse(rawBody) as OpenRouterErrorShape;
      message = parsed?.error?.message || "";
    } catch {
      // not JSON
    }
    // Never log the raw body: it could echo document content
    console.warn(
      `[OpenRouter RFQ][${reqId}] HTTP ${response.status} from ${model}`
    );

    if (response.status === 401 || response.status === 403) {
      throw new OpenRouterPermanentError(
        "Clé API OpenRouter invalide ou non autorisée.",
        401,
        "AUTH_ERROR"
      );
    }

    if (response.status === 400 || response.status === 422) {
      throw new OpenRouterPermanentError(
        message ||
          "Le document soumis n'a pas pu être traité par OpenRouter (requête invalide ou format non supporté).",
        response.status
      );
    }

    // 404, 408, 409, 429, 5xx and anything else upstream are treated as transient
    throw new OpenRouterTransientError(
      message ||
        `Le fournisseur OpenRouter est temporairement indisponible (HTTP ${response.status}).`,
      response.status >= 500 ? response.status : 503
    );
  }

  const data: unknown = await response.json().catch(() => null);
  const text = extractMessageText(data);

  if (!text) {
    throw new OpenRouterTransientError(
      "Le fournisseur OpenRouter n'a retourné aucun contenu structuré.",
      502
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new OpenRouterPermanentError(
      "La réponse renvoyée par OpenRouter n'est pas un JSON valide.",
      422
    );
  }

  const extracted = normalizeExtractedRFQPayload(parsedJson);

  return { extracted, model };
}

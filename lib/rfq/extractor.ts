// ============================================================================
// Provider-Independent RFQ Extraction Orchestrator
// Tries Google Gemini first; optionally falls back to OpenRouter (free tier)
// when the explicit feature flag RFQ_OPENROUTER_FREE_FALLBACK is "true" and
// the failure is transient. Shares one global execution budget with Gemini.
// ============================================================================

import type { AllowedRFQMimeType } from "@/lib/rfq-file-validation";
import {
  extractRFQWithGemini,
  RFQExtractionError,
  GLOBAL_EXTRACTION_DEADLINE_MS,
  classifyGeminiError,
} from "@/lib/gemini/rfq-extractor";
import {
  extractRFQWithOpenRouter,
  isOpenRouterFallbackFlagEnabled,
  isOpenRouterConfigured,
  getConfiguredOpenRouterModel,
  OpenRouterTransientError,
  OpenRouterPermanentError,
} from "@/lib/openrouter/rfq-extractor";
import type { ExtractedRFQ } from "@/lib/rfq-import-types";

export type RFQProviderName = "gemini" | "openrouter";

export interface OrchestratedRFQExtraction {
  extracted: ExtractedRFQ;
  provider: RFQProviderName;
  model: string;
  fallbackAttempted: boolean;
}

// Error categories from a Gemini failure that justify an OpenRouter attempt.
// Everything else (invalid document, auth problems, schema mismatches) is
// permanent and must surface to the user without a second provider call.
const FALLBACK_ELIGIBLE_CATEGORIES = new Set([
  "CAPACITY_UNAVAILABLE", // 503
  "SERVER_ERROR", // 500, 502
  "TIMEOUT", // 504
  "RATE_LIMIT", // 429
  "UNKNOWN", // unclassified network-level failures
]);

export interface OrchestrationDiagnostics {
  fallbackFlagEnabled: boolean;
  openRouterConfigured: boolean;
  openRouterModel: string;
}

export function getOrchestrationDiagnostics(): OrchestrationDiagnostics {
  return {
    fallbackFlagEnabled: isOpenRouterFallbackFlagEnabled(),
    openRouterConfigured: isOpenRouterConfigured(),
    openRouterModel: getConfiguredOpenRouterModel(),
  };
}

export async function extractRFQ(input: {
  bytes: Buffer;
  mimeType: AllowedRFQMimeType;
  requestId?: string;
}): Promise<OrchestratedRFQExtraction> {
  const reqId = input.requestId || "req-transient";
  const startTime = Date.now();

  try {
    const geminiResult = await extractRFQWithGemini({
      bytes: input.bytes,
      mimeType: input.mimeType,
      requestId: input.requestId,
    });

    return {
      extracted: geminiResult.extracted,
      provider: "gemini",
      model: geminiResult.model,
      fallbackAttempted: false,
    };
  } catch (geminiError) {
    // Only transient capacity/availability failures qualify. Permanent
    // errors (invalid document, auth, schema) propagate immediately.
    if (!(geminiError instanceof RFQExtractionError)) {
      throw geminiError;
    }

    const classified = classifyGeminiError(geminiError);
    if (!FALLBACK_ELIGIBLE_CATEGORIES.has(classified.category)) {
      throw geminiError;
    }

    const flagEnabled = isOpenRouterFallbackFlagEnabled();
    const configured = isOpenRouterConfigured();

    if (!flagEnabled) {
      console.info(
        `[RFQ Orchestrator][${reqId}] Gemini unavailable (${classified.category}) but OpenRouter fallback is disabled by flag.`
      );
      throw geminiError;
    }

    if (!configured) {
      console.warn(
        `[RFQ Orchestrator][${reqId}] OpenRouter fallback flag enabled but OPENROUTER_API_KEY is missing.`
      );
      throw geminiError;
    }

    const elapsed = Date.now() - startTime;
    const remaining = GLOBAL_EXTRACTION_DEADLINE_MS - elapsed;
    if (remaining <= 4_000) {
      console.warn(
        `[RFQ Orchestrator][${reqId}] Remaining execution budget too small for OpenRouter fallback (${remaining}ms).`
      );
      throw geminiError;
    }

    const openRouterTimeout = Math.min(remaining - 1_000, 20_000);
    console.info(
      `[RFQ Orchestrator][${reqId}] Gemini unavailable (${classified.category}); attempting OpenRouter fallback with model ${getConfiguredOpenRouterModel()} (timeout ${openRouterTimeout}ms).`
    );

    try {
      const openRouterResult = await extractRFQWithOpenRouter({
        bytes: input.bytes,
        mimeType: input.mimeType,
        timeoutMs: openRouterTimeout,
        requestId: input.requestId,
      });

      return {
        extracted: openRouterResult.extracted,
        provider: "openrouter",
        model: openRouterResult.model,
        fallbackAttempted: true,
      };
    } catch (openRouterError) {
      // Both providers failed: surface a combined error. Never retry either
      // provider again within the same request.
      if (openRouterError instanceof OpenRouterTransientError) {
        throw new RFQExtractionError(
          "Google Gemini et OpenRouter sont temporairement indisponibles. Votre fichier reste sélectionné : veuillez réessayer dans quelques instants.",
          openRouterError.status || 503,
          "CAPACITY_UNAVAILABLE"
        );
      }
      if (openRouterError instanceof OpenRouterPermanentError) {
        throw new RFQExtractionError(
          `Google Gemini est indisponible et le fallback OpenRouter a échoué : ${openRouterError.message}`,
          openRouterError.status || 502,
          "INVALID_REQUEST"
        );
      }
      throw openRouterError;
    }
  }
}

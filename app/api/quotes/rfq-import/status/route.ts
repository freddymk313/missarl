// ============================================================================
// API Route: GET /api/quotes/rfq-import/status
// Returns non-sensitive provider configuration for the RFQ importer UI so it
// can accurately disclose whether the OpenRouter free fallback is active.
// Never exposes API keys or model prompts.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { getOrchestrationDiagnostics } from "@/lib/rfq/extractor";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (!permissions.canManageQuotations(session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const diagnostics = getOrchestrationDiagnostics();

  return NextResponse.json({
    fallbackEnabled: diagnostics.fallbackFlagEnabled,
    // Only meaningful when the flag is on; a missing key with the flag on
    // means fallback will silently no-op, which the UI must disclose.
    fallbackReady:
      diagnostics.fallbackFlagEnabled && diagnostics.openRouterConfigured,
    fallbackModel: diagnostics.fallbackFlagEnabled
      ? diagnostics.openRouterModel
      : null,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  });
}

// ============================================================================
// Code Normalization Helper
// Used for MPN, client codes, and supplier item codes
// Uppercase, strip: spaces, hyphens, slashes, dots, underscores
// e.g. "KI-78 967" → "KI78967", "SDW6205050AE/NOR.V" → "SDW6205050AENORV"
// ============================================================================

export function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[\s\-\/\.\\_]/g, "");
}


"use client";

import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Layers,
} from "lucide-react";
import type { ModelDiagnosticResult } from "@/app/api/admin/gemini-diagnostic/route";

interface DiagnosticPayload {
  timestamp: string;
  configuration: {
    primary: string;
    fallbacks: string[];
    source: string;
  };
  results: ModelDiagnosticResult[];
  error?: string;
}

export function GeminiDiagnosticCard({
  initialPrimaryModel,
  initialFallbacks,
}: {
  initialPrimaryModel: string;
  initialFallbacks: string[];
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticPayload | null>(
    null
  );
  const [runError, setRunError] = useState<string | null>(null);

  const handleRunDiagnostic = async () => {
    setIsRunning(true);
    setRunError(null);

    try {
      const res = await fetch("/api/admin/gemini-diagnostic", {
        method: "POST",
      });

      const data = (await res.json().catch(() => ({}))) as DiagnosticPayload;

      if (!res.ok || data.error) {
        setRunError(
          data.error || "Échec de l'exécution du diagnostic Gemini."
        );
        return;
      }

      setDiagnosticData(data);
    } catch {
      setRunError("Erreur réseau lors de la communication avec l'API de diagnostic.");
    } finally {
      setIsRunning(false);
    }
  };

  const renderBadge = (status: string, durationMs?: number) => {
    switch (status) {
      case "Available":
      case "Operational":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success">
            <CheckCircle2 className="size-3" />
            {status}
            {durationMs !== undefined && durationMs > 0 && (
              <span className="text-muted-foreground text-[9px] font-mono ml-0.5">
                ({(durationMs / 1000).toFixed(1)}s)
              </span>
            )}
          </span>
        );
      case "Capacity unavailable":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500" title="Surcharge 503">
            <Clock className="size-3" />
            503 Surchargé
          </span>
        );
      case "Rate limited":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500" title="Quota 429">
            <AlertCircle className="size-3" />
            429 Quota
          </span>
        );
      case "Invalid model":
      case "Authentication error":
      case "Unavailable":
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive">
            <XCircle className="size-3" />
            {status}
          </span>
        );
      case "Degraded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500">
            <AlertCircle className="size-3" />
            Dégradé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
            Non testé
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-black text-primary flex items-center gap-2">
            <Sparkles className="size-4 text-accent" /> Google Gemini AI
            Infrastructure &amp; Diagnostic
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Diagnostic en direct des modèles Gemini (texte, JSON structuré, PDF synthétique) et stratégie de secours.
          </p>
        </div>

        <button
          type="button"
          disabled={isRunning}
          onClick={handleRunDiagnostic}
          className="inline-flex items-center justify-center gap-2 h-8 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw
            className={`size-3.5 ${isRunning ? "animate-spin" : ""}`}
          />
          {isRunning ? "Diagnostic en cours..." : "Lancer le test"}
        </button>
      </div>

      {/* Model Configuration Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-secondary/40 p-3 border border-border/60">
          <p className="text-muted-foreground font-semibold text-[11px]">
            Modèle principal configuré (GEMINI_MODEL)
          </p>
          <p className="font-mono font-bold text-primary text-xs mt-1">
            {diagnosticData?.configuration.primary || initialPrimaryModel}
          </p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3 border border-border/60">
          <p className="text-muted-foreground font-semibold text-[11px]">
            Chaîne de secours (Fallbacks validés)
          </p>
          <p className="font-mono font-bold text-foreground text-xs mt-1">
            {(
              diagnosticData?.configuration.fallbacks || initialFallbacks
            ).join(", ")}
          </p>
        </div>
      </div>

      {runError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-semibold">
          <AlertCircle className="size-4 shrink-0" />
          <span>{runError}</span>
        </div>
      )}

      {/* Results Table */}
      {diagnosticData && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" /> Résultats du dernier
              test :
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {new Date(diagnosticData.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-secondary/50 font-black text-muted-foreground text-[10px] uppercase border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Modèle</th>
                  <th className="py-2.5 px-3">Test A (Texte)</th>
                  <th className="py-2.5 px-3">Test B (JSON)</th>
                  <th className="py-2.5 px-3">Test C (PDF)</th>
                  <th className="py-2.5 px-3">Disponibilité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {diagnosticData.results.map((row) => (
                  <tr
                    key={row.model}
                    className="hover:bg-secondary/30 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{row.model}</span>
                        {row.isPrimary && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-primary/10 text-primary font-bold">
                            Principal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {renderBadge(
                        row.textTest.status,
                        row.textTest.durationMs
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {renderBadge(
                        row.jsonTest.status,
                        row.jsonTest.durationMs
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {renderBadge(
                        row.multimodalTest.status,
                        row.multimodalTest.durationMs
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {renderBadge(row.overallStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

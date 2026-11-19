"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  HelpCircle,
  Loader2,
  PackagePlus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { ClientRecord } from "@/lib/db/clients";
import type { ItemRecord, UnitRecord } from "@/lib/db/items";
import { QuotationWizard } from "@/components/dashboard/quotation-wizard";
import { createImportedItemsAction } from "@/actions/rfq-import";
import {
  ALLOWED_RFQ_MIME_TYPES,
  MAX_RFQ_FILE_BYTES,
} from "@/lib/rfq-file-validation";
import type {
  BulkCreateImportedItemInput,
  QuotationDraftLineInput,
  RFQAnalysisResponse,
  RFQMatchStatus,
} from "@/lib/rfq-import-types";
import {
  buildOrderedQuotationDraftLines,
  createInitialReviewLines,
  groupReviewLinesByStatus,
  REVIEW_GROUP_ORDER,
  validateReviewLinesForQuote,
  type EditableRFQReviewLine,
} from "@/lib/rfq-draft-builder";

interface RFQImporterProps {
  clients: ClientRecord[];
  initialItems: ItemRecord[];
  units: UnitRecord[];
  preselectedClientId?: string;
}

type ImporterStage = "upload" | "analyzing" | "review" | "wizard";

const GROUP_META: Record<
  RFQMatchStatus,
  {
    title: string;
    subtitle: string;
    badgeClass: string;
    borderClass: string;
  }
> = {
  NEW: {
    title: "1. Nouveaux articles à créer",
    subtitle:
      "Aucune correspondance fiable trouvée sur la désignation ou la description. Sélectionnez ceux à ajouter au catalogue MIS.",
    badgeClass:
      "bg-accent/15 text-primary border-accent/40",
    borderClass: "border-accent/35",
  },
  POSSIBLE_MATCH: {
    title: "2. Correspondances possibles à confirmer",
    subtitle:
      "Plusieurs articles proches ou score intermédiaire détecté. Confirmez l'article existant ou basculez en création d'un nouvel article.",
    badgeClass:
      "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    borderClass: "border-amber-500/30",
  },
  MATCHED: {
    title: "3. Articles reconnus dans le catalogue",
    subtitle:
      "Correspondance forte identifiée sur la désignation et la description. Prêts pour le devis à prix de vente initial 0,00 $.",
    badgeClass:
      "bg-success/15 text-success border-success/30",
    borderClass: "border-success/25",
  },
  NEEDS_REVIEW: {
    title: "4. Lignes à vérifier manuellement",
    subtitle:
      "Quantité manquante/invalide, unité non standardisée ou lecture incertaine. Corrigez ces lignes avant de générer le devis.",
    badgeClass:
      "bg-destructive/15 text-destructive border-destructive/30",
    borderClass: "border-destructive/30",
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function isAllowedClientFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  if (
    ALLOWED_RFQ_MIME_TYPES.includes(
      mime as (typeof ALLOWED_RFQ_MIME_TYPES)[number]
    )
  ) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png")
  );
}

export function RFQImporter({
  clients,
  initialItems,
  units: initialUnits,
  preselectedClientId,
}: RFQImporterProps) {
  const [stage, setStage] = useState<ImporterStage>("upload");
  const [clientId, setClientId] = useState(
    preselectedClientId || clients[0]?.id || ""
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Analysis & Review state
  const [analysisMeta, setAnalysisMeta] = useState<{
    model: string;
    clientRfqReference: string;
    documentTitle: string | null;
    totalExtractedItems: number;
  } | null>(null);
  const [units, setUnits] = useState<UnitRecord[]>(initialUnits);
  const [catalogItems, setCatalogItems] = useState<ItemRecord[]>(initialItems);
  const [reviewLines, setReviewLines] = useState<EditableRFQReviewLine[]>([]);
  const [reviewBannerError, setReviewBannerError] = useState<string | null>(null);
  const [reviewBannerSuccess, setReviewBannerSuccess] = useState<string | null>(
    null
  );
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);
  const [blockingLineNumbers, setBlockingLineNumbers] = useState<number[]>([]);

  // Stage 4 prepared draft lines
  const [preparedDraftLines, setPreparedDraftLines] = useState<
    QuotationDraftLineInput[]
  >([]);

  const handleFileSelection = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setUploadError("Le fichier sélectionné est vide.");
      return;
    }

    if (file.size > MAX_RFQ_FILE_BYTES) {
      setUploadError("Fichier trop volumineux (4 MB maximum).");
      return;
    }

    if (!isAllowedClientFile(file)) {
      setUploadError(
        "Format non accepté. Sélectionnez un fichier PDF, JPEG ou PNG."
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!clientId) {
      setUploadError("Veuillez sélectionner un client destinataire.");
      return;
    }
    if (!selectedFile) {
      setUploadError("Veuillez sélectionner un document RFQ (PDF, JPEG ou PNG).");
      return;
    }
    if (!acknowledged) {
      setUploadError(
        "Veuillez confirmer l'envoi temporaire du document à Google Gemini."
      );
      return;
    }

    setStage("analyzing");

    try {
      const formData = new FormData();
      formData.append("clientId", clientId);
      formData.append("acknowledged", "true");
      formData.append("file", selectedFile);

      const res = await fetch("/api/quotes/rfq-import/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json().catch(() => ({}))) as
        | RFQAnalysisResponse
        | { error?: string };

      if (!res.ok || !("success" in payload) || !payload.success) {
        const msg =
          ("error" in payload && payload.error) ||
          "L'analyse du document RFQ a échoué.";
        setUploadError(msg);
        setStage("upload");
        return;
      }

      if (payload.units && payload.units.length > 0) {
        setUnits(payload.units);
      }

      setAnalysisMeta({
        model: payload.model,
        clientRfqReference: payload.clientRfqReference || "",
        documentTitle: payload.documentTitle,
        totalExtractedItems: payload.totalExtractedItems,
      });
      setReviewLines(createInitialReviewLines(payload.lines));
      setReviewBannerError(null);
      setReviewBannerSuccess(null);
      setBlockingLineNumbers([]);
      setStage("review");
    } catch {
      setUploadError(
        "Impossible de joindre le serveur d'analyse. Vérifiez votre connexion et réessayez."
      );
      setStage("upload");
    }
  };

  const updateReviewLine = (
    sourceLineNumber: number,
    patch: Partial<EditableRFQReviewLine>
  ) => {
    setReviewLines((prev) =>
      prev.map((line) =>
        line.sourceLineNumber === sourceLineNumber
          ? { ...line, ...patch }
          : line
      )
    );
    setBlockingLineNumbers((prev) =>
      prev.filter((n) => n !== sourceLineNumber)
    );
  };

  const groupedLines = useMemo(
    () => groupReviewLinesByStatus(reviewLines),
    [reviewLines]
  );

  const summaryCounts = useMemo(
    () => ({
      total: reviewLines.length,
      newCount: groupedLines.NEW.length,
      possibleMatchCount: groupedLines.POSSIBLE_MATCH.length,
      matchedCount: groupedLines.MATCHED.length,
      needsReviewCount: groupedLines.NEEDS_REVIEW.length,
    }),
    [reviewLines.length, groupedLines]
  );

  const eligibleForBulkCreate = useMemo(
    () =>
      reviewLines.filter(
        (l) =>
          l.includedInQuote &&
          l.resolutionMode === "CREATE_NEW" &&
          l.selectedForCreate
      ),
    [reviewLines]
  );

  const handleToggleSelectAllNew = (checked: boolean) => {
    setReviewLines((prev) =>
      prev.map((line) =>
        line.resolutionMode === "CREATE_NEW" && line.includedInQuote
          ? { ...line, selectedForCreate: checked }
          : line
      )
    );
  };

  const handleBulkCreateItems = async () => {
    setReviewBannerError(null);
    setReviewBannerSuccess(null);

    if (eligibleForBulkCreate.length === 0) {
      setReviewBannerError(
        "Cochez au moins un nouvel article à créer dans le catalogue."
      );
      return;
    }

    // Check units & designations locally first so errors point directly to rows
    const invalidLocal = eligibleForBulkCreate.filter(
      (l) => !l.designation.trim() || !l.description.trim() || !l.unitCode.trim()
    );
    if (invalidLocal.length > 0) {
      setBlockingLineNumbers(invalidLocal.map((l) => l.sourceLineNumber));
      setReviewBannerError(
        `Certaines lignes cochées pour création manquent d'une désignation, d'une description ou d'une unité valide (Lignes #${invalidLocal
          .map((l) => l.sourceLineNumber)
          .join(", #")}).`
      );
      return;
    }

    setIsCreatingBulk(true);
    try {
      const payload: BulkCreateImportedItemInput[] = eligibleForBulkCreate.map(
        (l) => ({
          sourceLineNumber: l.sourceLineNumber,
          designation: l.designation.trim(),
          description: l.description.trim(),
          unitCode: l.unitCode.trim(),
        })
      );

      const res = await createImportedItemsAction(payload);

      if (res.createdItems.length > 0) {
        const nowIso = new Date().toISOString();
        const createdByLine = new Map(
          res.createdItems.map((c) => [c.sourceLineNumber, c.item])
        );

        setCatalogItems((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const additions: ItemRecord[] = res.createdItems
            .filter((c) => !existingIds.has(c.item.id))
            .map((c) => ({
              id: c.item.id,
              skuRef: c.item.skuRef,
              designation: c.item.designation,
              description: c.item.description,
              categoryId: null,
              categoryCode: null,
              categoryName: null,
              brandId: null,
              brandName: null,
              manufacturerPartNumber: null,
              unitCode: c.item.unitCode,
              supplyPrice: null,
              quotedPrice: null,
              vatIncluded: false,
              specs: {},
              isActive: true,
              createdAt: nowIso,
              updatedAt: nowIso,
            }));
          return [...additions, ...prev];
        });

        setReviewLines((prev) =>
          prev.map((line) => {
            const created = createdByLine.get(line.sourceLineNumber);
            if (!created) return line;
            return {
              ...line,
              status: line.status === "NEEDS_REVIEW" && (line.quantity === null || line.quantity <= 0)
                ? "NEEDS_REVIEW"
                : "MATCHED",
              resolutionMode: "LINK_EXISTING",
              linkedItemId: created.id,
              linkedSkuRef: created.skuRef,
              linkedDesignation: created.designation,
              selectedForCreate: false,
              possibleMatchConfirmed: true,
              createError: null,
              duplicateSuggestion: null,
            };
          })
        );
      }

      if (res.failures.length > 0) {
        const failureMap = new Map(
          res.failures.map((f) => [f.sourceLineNumber, f])
        );
        setReviewLines((prev) =>
          prev.map((line) => {
            const fail = failureMap.get(line.sourceLineNumber);
            if (!fail) return line;
            return {
              ...line,
              createError: fail.error,
              duplicateSuggestion: fail.duplicateItem ?? null,
            };
          })
        );
        setReviewBannerError(
          res.error ||
            `${res.failures.length} article(s) n'ont pas pu être créés. Vérifiez les alertes ci-dessous.`
        );
      }

      if (res.createdItems.length > 0) {
        setReviewBannerSuccess(
          `${res.createdItems.length} article(s) créé(s) dans le catalogue MIS SARL et associé(s) automatiquement.`
        );
      }
    } catch {
      setReviewBannerError(
        "Erreur lors de la création groupée des articles."
      );
    } finally {
      setIsCreatingBulk(false);
    }
  };

  const handlePrepareQuotation = () => {
    setReviewBannerError(null);
    setReviewBannerSuccess(null);

    const validation = validateReviewLinesForQuote(reviewLines);
    if (!validation.ok) {
      setBlockingLineNumbers(validation.blockingLineNumbers);
      setReviewBannerError(validation.error);
      return;
    }

    const orderedDrafts = buildOrderedQuotationDraftLines(reviewLines);
    setPreparedDraftLines(orderedDrafts);
    setBlockingLineNumbers([]);
    setStage("wizard");
  };

  // ── Stage 4: Prefilled Existing QuotationWizard ───────────────────────────
  if (stage === "wizard") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs">
            <Sparkles className="size-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-primary">
                Devis prérempli depuis l&apos;import RFQ ({preparedDraftLines.length}{" "}
                ligne{preparedDraftLines.length > 1 ? "s" : ""} dans l&apos;ordre
                d&apos;origine)
              </p>
              <p className="text-muted-foreground mt-0.5">
                Tous les prix de vente démarrent à{" "}
                <span className="font-mono font-bold text-foreground">
                  0,00 $
                </span>{" "}
                pour saisie commerciale manuelle. Aucun fichier RFQ n&apos;a été
                enregistré.
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold bg-card border border-border px-2.5 py-1 rounded-lg text-muted-foreground shrink-0">
            Ordre source préservé (1 → {preparedDraftLines.length})
          </span>
        </div>

        <QuotationWizard
          clients={clients}
          items={catalogItems}
          preselectedClientId={clientId}
          initialDraftLines={preparedDraftLines}
          initialRfqNumber={analysisMeta?.clientRfqReference || undefined}
          onBack={() => setStage("review")}
          backLabel="Retour à la révision des lignes RFQ"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Back Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <Link
          href="/dashboard/quotes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Retour à la liste des devis
        </Link>

        {/* Stage Indicator */}
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span
            className={`px-2.5 py-1 rounded-lg border ${
              stage === "upload"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border"
            }`}
          >
            1. Document
          </span>
          <span className="text-muted-foreground">→</span>
          <span
            className={`px-2.5 py-1 rounded-lg border ${
              stage === "analyzing"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border"
            }`}
          >
            2. Extraction IA
          </span>
          <span className="text-muted-foreground">→</span>
          <span
            className={`px-2.5 py-1 rounded-lg border ${
              stage === "review"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border"
            }`}
          >
            3. Correspondances
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="px-2.5 py-1 rounded-lg border bg-secondary text-muted-foreground border-border">
            4. Devis
          </span>
        </div>
      </div>

      {/* ── Stage 1: Upload & Privacy Notice ───────────────────────────────── */}
      {stage === "upload" && (
        <form
          onSubmit={handleAnalyzeSubmit}
          className="grid gap-6 lg:grid-cols-12 items-start"
        >
          <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              <h2 className="text-sm font-black text-primary">
                Document RFQ client &amp; destinataire
              </h2>
            </div>

            {uploadError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-bold text-destructive"
              >
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Recipient Client */}
            <div>
              <label
                htmlFor="rfq-client-select"
                className="block text-xs font-bold text-foreground mb-1.5"
              >
                Client destinataire *
              </label>
              <select
                id="rfq-client-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Fichier RFQ client (PDF, JPEG ou PNG — max 4 Mo) *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  handleFileSelection(file);
                }}
              />

              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const dropped = e.dataTransfer.files?.[0] ?? null;
                    handleFileSelection(dropped);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40"
                  }`}
                >
                  <UploadCloud className="size-9 mx-auto text-primary mb-3" />
                  <p className="text-xs font-black text-foreground">
                    Glissez-déposez votre RFQ ici ou cliquez pour parcourir
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Formats acceptés : PDF multi-pages, JPEG, PNG • Taille maximale : 4 MB
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <FileCheck2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatFileSize(selectedFile.size)} •{" "}
                        {selectedFile.type || "Document"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-[11px] font-bold text-foreground hover:bg-secondary cursor-pointer"
                    >
                      <RefreshCw className="size-3.5 text-primary" /> Remplacer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadError(null);
                      }}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-destructive/30 bg-destructive/5 text-[11px] font-bold text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" /> Retirer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Notice & Acknowledgement Checkbox */}
            <div className="rounded-xl border border-primary/20 bg-secondary/40 p-4 space-y-3">
              <div className="flex items-start gap-2.5 text-xs">
                <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-black text-primary">
                    Traitement temporaire par Google Gemini
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Ce document est analysé en mémoire vive uniquement par le
                    serveur MIS SARL via l&apos;API Google Gemini afin d&apos;en
                    extraire les lignes d&apos;articles. Le fichier n&apos;est
                    jamais enregistré en base de données ni dans un stockage
                    externe.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                />
                <span className="text-xs font-bold text-foreground">
                  Je confirme l&apos;envoi temporaire de cette RFQ client à
                  Google Gemini pour extraction des lignes.
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!clientId || !selectedFile || !acknowledged}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="size-4 text-accent" /> Analyser avec Gemini
              </button>
            </div>
          </div>

          {/* Rules Summary Side Card */}
          <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-black text-primary flex items-center gap-2 pb-2 border-b border-border">
              <FileText className="size-4 text-accent" /> Règles d&apos;import MIS SARL
            </h3>
            <ul className="space-y-2 text-muted-foreground leading-relaxed">
              <li>
                <strong className="text-foreground">Ordre exact :</strong>{" "}
                toutes les pages et lignes sont conservées dans l&apos;ordre du
                document client.
              </li>
              <li>
                <strong className="text-foreground">Rapprochement texte :</strong>{" "}
                comparaison stricte sur la{" "}
                <em>désignation</em> et la <em>description</em> du catalogue
                actif uniquement.
              </li>
              <li>
                <strong className="text-foreground">Aucun prix imposé :</strong>{" "}
                les lignes préremplies dans le devis démarrent toujours à{" "}
                <span className="font-mono font-bold text-foreground">
                  0,00 $
                </span>
                .
              </li>
              <li>
                <strong className="text-foreground">Unités vérifiées :</strong>{" "}
                toute unité inconnue est signalée pour sélection manuelle.
              </li>
            </ul>
          </div>
        </form>
      )}

      {/* ── Stage 2: Analyzing Loader ──────────────────────────────────────── */}
      {stage === "analyzing" && (
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center shadow-xs space-y-5">
          <div className="size-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="size-7 text-primary animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-black text-primary">
              Analyse de la RFQ en cours avec Gemini...
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedFile?.name} — Extraction complète multi-pages et
              rapprochement catalogue.
            </p>
          </div>

          <div className="space-y-2 text-left rounded-xl border border-border bg-secondary/30 p-4 text-xs">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="size-4 text-success shrink-0" />
              Validation binaire du document et transmission sécurisée serveur
            </div>
            <div className="flex items-center gap-2 text-primary font-bold">
              <Loader2 className="size-4 animate-spin shrink-0" />
              Extraction structurée de toutes les lignes d&apos;articles...
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <HelpCircle className="size-4 shrink-0" />
              Rapprochement par désignation et description avec le catalogue MIS
            </div>
          </div>
        </div>
      )}

      {/* ── Stage 3: Grouped Review & Bulk Item Creation ────────────────────── */}
      {stage === "review" && analysisMeta && (
        <div className="space-y-5">
          {/* Summary Strip */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Résultat d&apos;extraction • Modèle {analysisMeta.model}
                </p>
                <h2 className="text-base font-black text-primary mt-0.5">
                  {summaryCounts.total} ligne{summaryCounts.total > 1 ? "s" : ""}{" "}
                  extraite{summaryCounts.total > 1 ? "s" : ""} de la RFQ
                </h2>
                {analysisMeta.documentTitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Objet : {analysisMeta.documentTitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-1.5 text-xs">
                  <span className="font-bold text-muted-foreground">
                    Réf RFQ client :
                  </span>
                  <input
                    type="text"
                    value={analysisMeta.clientRfqReference}
                    onChange={(e) =>
                      setAnalysisMeta((prev) =>
                        prev
                          ? { ...prev, clientRfqReference: e.target.value }
                          : prev
                      )
                    }
                    placeholder="ex: 14425"
                    className="h-7 w-40 rounded-lg border border-border bg-card px-2 font-mono text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStage("upload");
                    setReviewBannerError(null);
                    setReviewBannerSuccess(null);
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
                >
                  <RefreshCw className="size-3.5" /> Changer de document
                </button>
              </div>
            </div>

            {/* Bucket Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="rounded-xl border border-accent/30 bg-accent/10 p-3">
                <span className="text-[10px] font-black uppercase text-muted-foreground block">
                  Nouveaux articles
                </span>
                <span className="text-lg font-black text-primary tabular-nums">
                  {summaryCounts.newCount}
                </span>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <span className="text-[10px] font-black uppercase text-muted-foreground block">
                  Correspondances possibles
                </span>
                <span className="text-lg font-black text-amber-700 dark:text-amber-300 tabular-nums">
                  {summaryCounts.possibleMatchCount}
                </span>
              </div>
              <div className="rounded-xl border border-success/30 bg-success/10 p-3">
                <span className="text-[10px] font-black uppercase text-muted-foreground block">
                  Reconnus au catalogue
                </span>
                <span className="text-lg font-black text-success tabular-nums">
                  {summaryCounts.matchedCount}
                </span>
              </div>
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <span className="text-[10px] font-black uppercase text-muted-foreground block">
                  À vérifier
                </span>
                <span className="text-lg font-black text-destructive tabular-nums">
                  {summaryCounts.needsReviewCount}
                </span>
              </div>
            </div>

            {/* Bulk & Quote Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllNew(true)}
                  className="h-8 px-3 rounded-lg border border-border bg-secondary/50 text-[11px] font-bold text-foreground hover:bg-secondary cursor-pointer"
                >
                  Tout sélectionner (nouveaux)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllNew(false)}
                  className="h-8 px-3 rounded-lg border border-border bg-card text-[11px] font-bold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Tout désélectionner
                </button>
                <button
                  type="button"
                  disabled={
                    isCreatingBulk || eligibleForBulkCreate.length === 0
                  }
                  onClick={handleBulkCreateItems}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingBulk ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <PackagePlus className="size-3.5" />
                  )}
                  Créer les articles sélectionnés ({eligibleForBulkCreate.length})
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrepareQuotation}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-success text-success-foreground text-xs font-bold hover:bg-success/90 transition-colors shadow-xs cursor-pointer"
              >
                Préparer le devis <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {reviewBannerError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-bold text-destructive"
            >
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>{reviewBannerError}</span>
            </div>
          )}

          {reviewBannerSuccess && (
            <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs font-bold text-success">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{reviewBannerSuccess}</span>
            </div>
          )}

          {/* 4 Grouped Sections in strict order: NEW, POSSIBLE_MATCH, MATCHED, NEEDS_REVIEW */}
          <div className="space-y-6">
            {REVIEW_GROUP_ORDER.map((groupKey) => {
              const rows = groupedLines[groupKey];
              if (rows.length === 0) return null;
              const meta = GROUP_META[groupKey];

              return (
                <section
                  key={groupKey}
                  className={`rounded-2xl border bg-card shadow-xs overflow-hidden ${meta.borderClass}`}
                >
                  <div className="px-5 py-4 border-b border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-primary">
                          {meta.title}
                        </h3>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-black tabular-nums ${meta.badgeClass}`}
                        >
                          {rows.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {meta.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-border/70">
                    {rows.map((line) => {
                      const isBlocking = blockingLineNumbers.includes(
                        line.sourceLineNumber
                      );

                      return (
                        <div
                          key={line.sourceLineNumber}
                          className={`p-4 sm:p-5 space-y-3 ${
                            !line.includedInQuote
                              ? "opacity-55 bg-secondary/20"
                              : isBlocking
                              ? "bg-destructive/5"
                              : ""
                          }`}
                        >
                          {/* Row Top Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-md">
                                Ligne #{line.sourceLineNumber}
                              </span>
                              {line.pageNumber && (
                                <span className="font-mono text-[10px] font-bold bg-secondary border border-border px-2 py-0.5 rounded-md text-muted-foreground">
                                  Page {line.pageNumber}
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-border bg-card text-muted-foreground">
                                Confiance :{" "}
                                {line.confidence === "high"
                                  ? "Élevée"
                                  : line.confidence === "medium"
                                  ? "Moyenne"
                                  : "Faible"}
                              </span>
                              {line.linkedSkuRef &&
                                line.resolutionMode === "LINK_EXISTING" && (
                                  <span className="font-mono text-[10px] font-black bg-success/15 text-success border border-success/30 px-2 py-0.5 rounded-md">
                                    Lié : {line.linkedSkuRef}
                                  </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              {line.resolutionMode === "CREATE_NEW" &&
                                line.includedInQuote && (
                                  <label className="inline-flex items-center gap-1.5 font-bold text-primary cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={line.selectedForCreate}
                                      onChange={(e) =>
                                        updateReviewLine(
                                          line.sourceLineNumber,
                                          { selectedForCreate: e.target.checked }
                                        )
                                      }
                                      className="size-3.5 rounded border-border cursor-pointer"
                                    />
                                    Créer au catalogue
                                  </label>
                                )}

                              <label className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={line.includedInQuote}
                                  onChange={(e) =>
                                    updateReviewLine(line.sourceLineNumber, {
                                      includedInQuote: e.target.checked,
                                    })
                                  }
                                  className="size-3.5 rounded border-border cursor-pointer"
                                />
                                Inclure dans le devis
                              </label>
                            </div>
                          </div>

                          {/* Warnings / Extraction Notes */}
                          {(line.needsReviewReason ||
                            line.unitMatchWarning ||
                            line.extractionNotes ||
                            line.createError) && (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                              {line.needsReviewReason && (
                                <p className="font-bold">
                                  À vérifier : {line.needsReviewReason}
                                </p>
                              )}
                              {line.unitMatchWarning && !line.unitCode && (
                                <p>{line.unitMatchWarning}</p>
                              )}
                              {line.extractionNotes && (
                                <p>Note IA : {line.extractionNotes}</p>
                              )}
                              {line.createError && (
                                <div className="flex flex-wrap items-center gap-2 text-destructive font-bold pt-1">
                                  <span>{line.createError}</span>
                                  {line.duplicateSuggestion && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateReviewLine(line.sourceLineNumber, {
                                          resolutionMode: "LINK_EXISTING",
                                          linkedItemId:
                                            line.duplicateSuggestion!.id,
                                          linkedSkuRef:
                                            line.duplicateSuggestion!.skuRef,
                                          linkedDesignation:
                                            line.duplicateSuggestion!
                                              .designation,
                                          selectedForCreate: false,
                                          possibleMatchConfirmed: true,
                                          createError: null,
                                          duplicateSuggestion: null,
                                        })
                                      }
                                      className="h-6 px-2 rounded-md bg-primary text-primary-foreground text-[10px] font-bold cursor-pointer"
                                    >
                                      Associer {line.duplicateSuggestion.skuRef}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Editable Designation / Description / Quantity / Unit */}
                          <div className="grid gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-4">
                              <label className="block text-[11px] font-bold text-foreground mb-1">
                                Désignation *
                              </label>
                              <input
                                type="text"
                                value={line.designation}
                                onChange={(e) =>
                                  updateReviewLine(line.sourceLineNumber, {
                                    designation: e.target.value,
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                              />
                            </div>

                            <div className="sm:col-span-4">
                              <label className="block text-[11px] font-bold text-foreground mb-1">
                                Description technique *
                              </label>
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) =>
                                  updateReviewLine(line.sourceLineNumber, {
                                    description: e.target.value,
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-foreground mb-1">
                                Quantité *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={line.quantity ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const num = raw === "" ? null : parseFloat(raw);
                                  updateReviewLine(line.sourceLineNumber, {
                                    quantity:
                                      num !== null && Number.isFinite(num)
                                        ? num
                                        : null,
                                  });
                                }}
                                placeholder="Ex: 5"
                                className={`h-9 w-full rounded-xl border bg-card px-3 font-mono text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 ${
                                  line.quantity === null || line.quantity <= 0
                                    ? "border-destructive text-destructive"
                                    : "border-border text-foreground"
                                }`}
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <label className="block text-[11px] font-bold text-foreground">
                                  Unité *
                                </label>
                                {line.rawUnit && (
                                  <span className="font-mono text-[10px] text-muted-foreground truncate">
                                    RFQ: {line.rawUnit}
                                  </span>
                                )}
                              </div>
                              <select
                                value={line.unitCode}
                                onChange={(e) =>
                                  updateReviewLine(line.sourceLineNumber, {
                                    unitCode: e.target.value,
                                  })
                                }
                                className={`h-9 w-full rounded-xl border bg-card px-2.5 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                                  !line.unitCode
                                    ? "border-destructive text-destructive"
                                    : "border-border text-foreground"
                                }`}
                              >
                                <option value="">-- Choisir --</option>
                                {units.map((u) => (
                                  <option key={u.code} value={u.code}>
                                    {u.code} ({u.labelFr})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Candidates & Resolution Picker (up to 3 candidates) */}
                          {(line.candidates.length > 0 ||
                            line.status === "POSSIBLE_MATCH" ||
                            line.status === "MATCHED") && (
                            <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-black text-primary">
                                  Suggestions catalogue (désignation &amp; description uniquement)
                                </span>
                                {line.status === "POSSIBLE_MATCH" &&
                                  line.resolutionMode === "LINK_EXISTING" && (
                                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={line.possibleMatchConfirmed}
                                        onChange={(e) =>
                                          updateReviewLine(
                                            line.sourceLineNumber,
                                            {
                                              possibleMatchConfirmed:
                                                e.target.checked,
                                            }
                                          )
                                        }
                                        className="size-3.5 rounded border-border cursor-pointer"
                                      />
                                      Confirmer cette association
                                    </label>
                                  )}
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {line.candidates.map((cand) => {
                                  const isSelected =
                                    line.resolutionMode === "LINK_EXISTING" &&
                                    line.linkedItemId === cand.itemId;
                                  return (
                                    <button
                                      key={cand.itemId}
                                      type="button"
                                      onClick={() =>
                                        updateReviewLine(
                                          line.sourceLineNumber,
                                          {
                                            resolutionMode: "LINK_EXISTING",
                                            linkedItemId: cand.itemId,
                                            linkedSkuRef: cand.skuRef,
                                            linkedDesignation: cand.designation,
                                            selectedForCreate: false,
                                            possibleMatchConfirmed: true,
                                          }
                                        )
                                      }
                                      className={`text-left rounded-xl border p-2.5 text-xs transition-colors cursor-pointer ${
                                        isSelected
                                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                          : "border-border bg-card hover:bg-secondary/50"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="font-mono text-[10px] font-black text-primary">
                                          {cand.skuRef}
                                        </span>
                                        <span className="font-mono text-[10px] font-bold text-muted-foreground">
                                          {Math.round(cand.score * 100)}%
                                        </span>
                                      </div>
                                      <p className="font-bold text-foreground line-clamp-1">
                                        {cand.designation || cand.description}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                                        {cand.description}
                                      </p>
                                    </button>
                                  );
                                })}

                                {/* Option to create as new instead of linking */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateReviewLine(line.sourceLineNumber, {
                                      resolutionMode: "CREATE_NEW",
                                      linkedItemId: null,
                                      linkedSkuRef: null,
                                      linkedDesignation: null,
                                      selectedForCreate: true,
                                      possibleMatchConfirmed: true,
                                    })
                                  }
                                  className={`text-left rounded-xl border p-2.5 text-xs transition-colors cursor-pointer ${
                                    line.resolutionMode === "CREATE_NEW"
                                      ? "border-accent bg-accent/15 ring-1 ring-accent/40"
                                      : "border-dashed border-border bg-card hover:bg-secondary/50"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 font-black text-primary mb-1">
                                    <PackagePlus className="size-3.5 text-accent" />
                                    <span>Créer un nouvel article</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    Ne pas associer aux suggestions et ajouter
                                    comme nouvel article catalogue.
                                  </p>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

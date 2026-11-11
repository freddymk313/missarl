"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  Loader2,
  AlertCircle,
  Eye,
} from "lucide-react";

interface QuotationPdfActionsProps {
  quotationId: string;
  quotationRef: string;
  /** Compact variant for use inside table rows */
  compact?: boolean;
}

/**
 * PDF action buttons for a quotation.
 * Calls the server-side API route — credentials forwarded via cookie.
 * Never generates PDF from client-side state.
 */
export function QuotationPdfActions({
  quotationId,
  quotationRef,
  compact = false,
}: QuotationPdfActionsProps) {
  const [loading, setLoading] = useState<"preview" | "download" | "print" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = (disposition: "inline" | "attachment") =>
    `/api/quotations/${quotationId}/pdf?disposition=${disposition}`;

  const handlePreview = () => {
    setError(null);
    setLoading("preview");
    // Open in new tab — browser's native PDF viewer handles display & print
    const win = window.open(pdfUrl("inline"), "_blank", "noopener,noreferrer");
    if (!win) {
      setError("Unable to open preview. Please allow popups for this site.");
    }
    setLoading(null);
  };

  const handleDownload = async () => {
    setError(null);
    setLoading("download");
    try {
      const res = await fetch(pdfUrl("attachment"));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Failed to download PDF."
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeRef = quotationRef
        .replace(/[^a-zA-Z0-9\-_]/g, "-")
        .replace(/-+/g, "-")
        .toUpperCase();
      a.href = url;
      a.download = `MIS-${safeRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to generate PDF."
      );
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = () => {
    setError(null);
    setLoading("print");
    const win = window.open(pdfUrl("inline"), "_blank", "noopener,noreferrer");
    if (!win) {
      setError("Unable to open print preview. Please allow popups for this site.");
      setLoading(null);
      return;
    }
    // The PDF opens in the new tab; user can print via Ctrl+P
    setLoading(null);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading !== null}
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
          title="PDF Preview"
        >
          {loading === "preview" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading !== null}
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
          title="Download PDF"
        >
          {loading === "download" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Preview */}
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading !== null}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          {loading === "preview" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          {loading === "preview" ? "Generating..." : "PDF Preview"}
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading !== null}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-secondary border border-border text-foreground text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading === "download" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {loading === "download" ? "Downloading..." : "Download PDF"}
        </button>

        {/* Print */}
        <button
          type="button"
          onClick={handlePrint}
          disabled={loading !== null}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-secondary border border-border text-foreground text-xs font-bold hover:bg-secondary/80 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading === "print" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Printer className="size-4" />
          )}
          Print
        </button>
      </div>
    </div>
  );
}


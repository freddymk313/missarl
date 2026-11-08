import { requireSession } from "@/lib/auth";
import { getInvoices } from "@/lib/db/invoices";
import { InvoicesManager } from "@/components/dashboard/invoices-manager";
import { Receipt, ShieldCheck } from "lucide-react";

export default async function FacturesPage() {
  const session = await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const invoices = await getInvoices();

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          
          <div>
            
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Factures de Vente & Bon de livraison
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Suivi des factures émises, calculs de TVA 16%, gestion des échéances et états de paiement.
            </p>
          </div>
        </div>
      </div>

      <InvoicesManager initialInvoices={invoices} />
    </div>
  );
}
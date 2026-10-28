import { requireSession } from "@/lib/auth";
import { getInvoices } from "@/lib/db/invoices";
import { InvoicesManager } from "@/components/dashboard/invoices-manager";

export default async function FacturesPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const invoices = await getInvoices();

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="kicker">Facturation & Recouvrement</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Factures de Vente
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Suivi des factures émises, calculs de TVA 16%, gestion des échéances et états de paiement.
        </p>
      </div>

      <InvoicesManager initialInvoices={invoices} />
    </div>
  );
}

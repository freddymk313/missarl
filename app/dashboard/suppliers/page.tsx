import { requireSession } from "@/lib/auth";
import { getSuppliers } from "@/lib/db/suppliers";
import { SuppliersManager } from "@/components/dashboard/suppliers-manager";
import { Truck, ShieldCheck } from "lucide-react";

export default async function SuppliersPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Fournisseurs Industriels
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestion des fabricants partenaires, importateurs miniers et contacts logistiques.
            </p>
          </div>
        </div>
      </div>

      <SuppliersManager initialSuppliers={suppliers} />
    </div>
  );
}
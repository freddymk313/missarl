import { requireSession } from "@/lib/auth";
import { getSuppliers } from "@/lib/db/suppliers";
import { SuppliersManager } from "@/components/dashboard/suppliers-manager";

export default async function SuppliersPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="kicker">Partenariats & Approvisionnements</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Fournisseurs Industriels
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gestion des fabricants partenaires, importateurs miniers et contacts logistiques.
        </p>
      </div>

      <SuppliersManager initialSuppliers={suppliers} />
    </div>
  );
}

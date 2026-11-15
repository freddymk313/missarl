import { requireSession } from "@/lib/auth";
import { getSuppliers } from "@/lib/db/suppliers";
import { SuppliersManager } from "@/components/dashboard/suppliers-manager";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { Truck } from "lucide-react";

export default async function SuppliersPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Industrial Suppliers"
        description="Manage partner manufacturers, mining importers, and logistics contacts."
      />

      <SuppliersManager initialSuppliers={suppliers} />
    </div>
  );
}

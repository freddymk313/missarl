import { requireSession } from "@/lib/auth";
import { getSuppliers } from "@/lib/db/suppliers";
import { SuppliersManager } from "@/components/dashboard/suppliers-manager";

export default async function SuppliersPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const suppliers = await getSuppliers();

  return <SuppliersManager initialSuppliers={suppliers} />;
}

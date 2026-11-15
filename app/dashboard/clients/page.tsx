import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { ClientsManager } from "@/components/dashboard/clients-manager";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { Building2 } from "lucide-react";

export default async function ClientsPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const clients = await getClients();

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Clients & Mining Companies"
        description="Manage client accounts, on-site delivery addresses, contacts, and access to commercial files."
      />

      <ClientsManager initialClients={clients} />
    </div>
  );
}

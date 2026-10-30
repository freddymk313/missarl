import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { ClientsManager } from "@/components/dashboard/clients-manager";

export default async function ClientsPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const clients = await getClients();

  return <ClientsManager initialClients={clients} />;
}

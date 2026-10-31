import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { ClientsManager } from "@/components/dashboard/clients-manager";
import { Building2, ShieldCheck } from "lucide-react";

export default async function ClientsPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const clients = await getClients();

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-4">
          
          <div>
            
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
              Clients & Sociétés Minières
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestion des comptes clients, adresses de livraison sur site, coordonnées et accès aux dossiers commerciaux.
            </p>
          </div>
        </div>
      </div>

      <ClientsManager initialClients={clients} />
    </div>
  );
}
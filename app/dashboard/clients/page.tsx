import { requireSession } from "@/lib/auth";
import { getClients } from "@/lib/db/clients";
import { ClientsManager } from "@/components/dashboard/clients-manager";

export default async function UsersPage() {
  await requireSession(["SUPER_ADMIN", "ADMIN"]);
  const clients = await getClients();

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="kicker">Portefeuille Partenaires</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Clients & Sociétés Minières
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gestion des comptes clients, adresses de livraison sur site,
          coordonnées et accès aux dossiers commerciaux.
        </p>
      </div>

      <ClientsManager initialClients={clients} />
    </div>
  );
}

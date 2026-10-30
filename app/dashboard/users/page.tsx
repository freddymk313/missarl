import { requireSession } from "@/lib/auth";
import { getUsers } from "@/lib/db/users";
import { UsersManager } from "@/components/dashboard/users-manager";

export default async function UtilisateursPage() {
  const session = await requireSession(["SUPER_ADMIN"]);
  const users = await getUsers();

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="kicker">Sécurité & Contrôle d&apos;Accès</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Gestion des Utilisateurs & Rôles
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Attribution des rôles stricts (Super Admin, Admin Commercial, Collecteur de Prix) et contrôle d&apos;activation des comptes.
        </p>
      </div>

      <UsersManager initialUsers={users} currentUserId={session.id} />
    </div>
  );
}

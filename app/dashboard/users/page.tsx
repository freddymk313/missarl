import { requireSession } from "@/lib/auth";
import { getUsers } from "@/lib/db/users";
import { UsersManager } from "@/components/dashboard/users-manager";

export default async function UtilisateursPage() {
  const session = await requireSession(["SUPER_ADMIN"]);
  const users = await getUsers();

  return <UsersManager initialUsers={users} currentUserId={session.id} />;
}

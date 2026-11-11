import { requireSession } from "@/lib/auth";
import { getUsers } from "@/lib/db/users";
import { UsersManager } from "@/components/dashboard/users-manager";

export default async function UsersPage() {
  const session = await requireSession(["SUPER_ADMIN"]);
  const users = await getUsers();

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          User &amp; Role Management
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Assign strict roles (Super Admin, Commercial Admin, Price Collector) and control account activation.
        </p>
      </div>

      <UsersManager initialUsers={users} currentUserId={session.id} />
    </div>
  );
}

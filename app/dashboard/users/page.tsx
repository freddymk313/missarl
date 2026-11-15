import { requireSession } from "@/lib/auth";
import { getUsers } from "@/lib/db/users";
import { UsersManager } from "@/components/dashboard/users-manager";
import { PageHeader } from "@/components/dashboard/ui/page-header";
import { Users } from "lucide-react";

export default async function UsersPage() {
  const session = await requireSession(["SUPER_ADMIN"]);
  const users = await getUsers();

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="User & Role Management"
        description="Assign strict roles (Super Admin, Commercial Admin, Price Collector) and control account activation."
      />

      <UsersManager initialUsers={users} currentUserId={session.id} />
    </div>
  );
}

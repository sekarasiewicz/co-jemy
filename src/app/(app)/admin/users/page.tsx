import { getSession } from "@/app/actions/auth";
import { listUsers } from "@/lib/services/admin";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [usersList, session] = await Promise.all([listUsers(), getSession()]);

  return (
    <UsersTable users={usersList} currentUserId={session?.user.id ?? ""} />
  );
}

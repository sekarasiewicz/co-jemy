import { ensureAdminPage, getSession } from "@/lib/session";
import { listUsers } from "@/lib/services/admin";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await ensureAdminPage();
  const [usersList, session] = await Promise.all([listUsers(), getSession()]);

  return (
    <UsersTable users={usersList} currentUserId={session?.user.id ?? ""} />
  );
}

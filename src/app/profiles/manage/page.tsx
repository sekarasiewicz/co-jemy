import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { getProfilesAction } from "@/app/actions/profiles";
import { ProfilesManager } from "./profiles-manager";

export default async function ManageProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const profiles = await getProfilesAction();
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Zarządzaj profilami
        </h1>

        <ProfilesManager
          initialProfiles={profiles}
          showCreateForm={params.create === "true"}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}

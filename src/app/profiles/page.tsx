import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import {
  getProfilesAction,
  initializeNewUserAction,
} from "@/app/actions/profiles";
import { ProfileSelector } from "./profile-selector";

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  let profiles = await getProfilesAction();

  // Initialize default profile and meal types for new users
  const params = await searchParams;
  if (params.new === "true" && profiles.length === 0) {
    await initializeNewUserAction();
    profiles = await getProfilesAction();
  }

  if (profiles.length === 0) {
    redirect("/profiles/manage?create=true");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Kto je?</h1>
        <p className="text-muted-foreground mb-8">Wybierz swój profil</p>

        <ProfileSelector profiles={profiles} />
      </div>
    </div>
  );
}

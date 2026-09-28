import { redirect } from "next/navigation";
import { getIsAdmin, getSession } from "@/lib/session";
import { getProfilesAction } from "@/app/actions/profiles";
import { Navbar } from "@/components/navbar";
import { cookies } from "next/headers";
import { ProfileProvider } from "@/contexts/profile-context";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/profile-cookie";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const [profiles, isAdmin, cookieStore] = await Promise.all([
    getProfilesAction(),
    getIsAdmin(),
    cookies(),
  ]);

  if (profiles.length === 0) {
    redirect("/profiles?new=true");
  }

  return (
    // Nested provider: the app gets profiles and the active one on the first
    // render instead of after client effects.
    <ProfileProvider
      initialProfiles={profiles}
      initialActiveProfileId={cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value}
    >
      <Navbar isAdmin={isAdmin} />
      <main className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-10 py-6">
        {children}
      </main>
    </ProfileProvider>
  );
}

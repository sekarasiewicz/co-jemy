import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { getProfilesAction } from "@/app/actions/profiles";
import { Navbar } from "@/components/navbar";
import { AppLayoutClient } from "./layout-client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const profiles = await getProfilesAction();

  if (profiles.length === 0) {
    redirect("/profiles?new=true");
  }

  return (
    <AppLayoutClient profiles={profiles}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </AppLayoutClient>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { AccountSettings } from "./account-settings";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Twoje konto
        </h1>
        <p className="text-sm text-muted-foreground">
          Zarządzaj swoim profilem i bezpieczeństwem
        </p>
      </div>

      <AccountSettings
        user={{
          name: session.user.name ?? "",
          email: session.user.email,
          image: session.user.image ?? "",
        }}
      />
    </div>
  );
}

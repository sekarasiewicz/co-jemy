import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { getProfilesByUserId } from "@/lib/services/profiles";
import { ImportDietForm } from "./import-diet-form";

export default async function ImportDietPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const profiles = await getProfilesByUserId(session.user.id);

  return (
    <div className="max-w-3xl mx-auto">
      <ImportDietForm
        profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}

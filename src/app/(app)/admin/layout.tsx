import { Shield } from "lucide-react";
import { ensureAdminPage } from "@/lib/session";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureAdminPage();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="bg-brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-warm">
          <Shield className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Panel administratora
          </h1>
          <p className="text-sm text-muted-foreground">
            Zarządzanie aplikacją co jemy?
          </p>
        </div>
      </div>

      <AdminNav />

      {children}
    </div>
  );
}

import { Check, X } from "lucide-react";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { Card, CardContent } from "@/components/ui";

export const dynamic = "force-dynamic";

async function checkDb(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <span
        className={`flex items-center gap-1.5 text-sm font-semibold ${
          ok ? "text-lime-700 dark:text-lime-400" : "text-destructive"
        }`}
      >
        {ok ? (
          <>
            <Check className="h-4 w-4" /> OK
          </>
        ) : (
          <>
            <X className="h-4 w-4" /> Brak
          </>
        )}
      </span>
    </div>
  );
}

export default async function AdminSystemPage() {
  const dbOk = await checkDb();

  const env = [
    { label: "DATABASE_URL", ok: !!process.env.DATABASE_URL, detail: "Baza danych (Neon)" },
    { label: "GEMINI_API_KEY", ok: !!process.env.GEMINI_API_KEY, detail: "Google Gemini (AI)" },
    {
      label: "BLOB_READ_WRITE_TOKEN",
      ok: !!process.env.BLOB_READ_WRITE_TOKEN,
      detail: "Vercel Blob (upload zdjęć)",
    },
    { label: "BETTER_AUTH_SECRET", ok: !!process.env.BETTER_AUTH_SECRET, detail: "Sekret sesji" },
    { label: "INVITE_CODE", ok: !!process.env.INVITE_CODE, detail: "Kod zaproszenia (rejestracja)" },
    {
      label: "NEXT_PUBLIC_APP_URL",
      ok: !!process.env.NEXT_PUBLIC_APP_URL,
      detail: process.env.NEXT_PUBLIC_APP_URL || "Adres aplikacji",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-0">
          <h2 className="border-b border-border px-4 py-3 font-semibold text-foreground">
            Połączenia
          </h2>
          <div className="divide-y divide-border">
            <StatusRow label="Baza danych" ok={dbOk} detail="Zapytanie testowe select 1" />
            <StatusRow
              label="Vercel Blob"
              ok={!!process.env.BLOB_READ_WRITE_TOKEN}
              detail="Token obecny w środowisku"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <h2 className="border-b border-border px-4 py-3 font-semibold text-foreground">
            Zmienne środowiskowe
          </h2>
          <div className="divide-y divide-border">
            {env.map((e) => (
              <StatusRow key={e.label} label={e.label} ok={e.ok} detail={e.detail} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <h2 className="mb-3 font-semibold text-foreground">Środowisko</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Node.js</dt>
              <dd className="font-medium text-foreground">{process.version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Środowisko</dt>
              <dd className="font-medium text-foreground">
                {process.env.NODE_ENV}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Region</dt>
              <dd className="font-medium text-foreground">
                {process.env.VERCEL_REGION || "lokalnie"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

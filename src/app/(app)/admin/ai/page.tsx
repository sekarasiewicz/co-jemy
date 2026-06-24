import { Card, CardContent } from "@/components/ui";
import { getAiUsageByModel, getRecentAiUsage } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

const OPERATION_LABELS: Record<string, string> = {
  enrich_ingredients: "Wzbogacanie składników",
  extract_diet: "Import diety (PDF)",
  create_meal_from_text: "Danie z tekstu (AI)",
  create_meal_from_image: "Danie ze zdjęcia (AI)",
};

export default async function AdminAiPage() {
  const [rows, byModel] = await Promise.all([
    getRecentAiUsage(150),
    getAiUsageByModel(),
  ]);

  const fmtUsd = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  const fmtDateTime = (d: Date) =>
    new Date(d).toLocaleString("pl-PL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {byModel.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              Brak zarejestrowanych zapytań AI
            </CardContent>
          </Card>
        ) : (
          byModel.map((m) => (
            <Card key={m.model}>
              <CardContent className="py-4">
                <p className="text-sm font-semibold text-foreground">
                  {m.model}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-primary">
                  {fmtUsd(m.costUsd)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.calls} zapytań · {m.tokens.toLocaleString("pl-PL")} tokenów
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Użytkownik</th>
                  <th className="px-4 py-3 font-medium">Operacja</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 text-right font-medium">Tokeny</th>
                  <th className="px-4 py-3 text-right font-medium">Koszt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Brak danych
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="text-foreground">
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {fmtDateTime(r.createdAt)}
                      </td>
                      <td className="max-w-40 truncate px-4 py-2.5 text-muted-foreground">
                        {r.email ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {OPERATION_LABELS[r.operation] ?? r.operation}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {r.model}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-muted-foreground">
                        {r.totalTokens.toLocaleString("pl-PL")}
                        <span className="text-muted-foreground/60">
                          {" "}
                          ({r.promptTokens}/{r.outputTokens})
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-primary">
                        {fmtUsd(r.costUsd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import {
  Apple,
  CalendarDays,
  DollarSign,
  ListChecks,
  Sparkles,
  Tag as TagIcon,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { getAdminStats, getAiUsageByModel } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "primary" | "fit" | "amber" | "sky";
}) {
  const tint = {
    primary: "bg-primary/10 text-primary",
    fit: "bg-fit/15 text-lime-700 dark:text-lime-400",
    amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    sky: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  }[accent];

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <span
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${tint}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && (
            <p className="text-xs font-medium text-primary mt-0.5">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const [stats, byModel] = await Promise.all([
    getAdminStats(),
    getAiUsageByModel(),
  ]);

  const fmtUsd = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={UsersRound}
          label="Użytkownicy"
          value={stats.users}
          sub={stats.newUsers7d > 0 ? `+${stats.newUsers7d} w 7 dni` : undefined}
        />
        <StatCard
          icon={UsersRound}
          label="Profile"
          value={stats.profiles}
          accent="sky"
        />
        <StatCard
          icon={UtensilsCrossed}
          label="Dania"
          value={stats.meals}
          accent="amber"
        />
        <StatCard
          icon={Apple}
          label="Składniki"
          value={stats.ingredients}
          accent="fit"
        />
        <StatCard icon={TagIcon} label="Tagi" value={stats.tags} accent="sky" />
        <StatCard
          icon={ListChecks}
          label="Listy zakupów"
          value={stats.shoppingLists}
          accent="fit"
        />
        <StatCard
          icon={CalendarDays}
          label="Plany dzienne"
          value={stats.dailyPlans}
          accent="amber"
        />
        <StatCard
          icon={Sparkles}
          label="Zapytania AI"
          value={stats.aiCalls}
        />
      </div>

      {/* AI cost highlight */}
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="bg-brand-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-warm">
                <DollarSign className="h-6 w-6" />
              </span>
              <div>
                <p className="text-3xl font-extrabold text-foreground">
                  {fmtUsd(stats.aiCostUsd)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Szacowany koszt AI ·{" "}
                  {stats.aiTokens.toLocaleString("pl-PL")} tokenów ·{" "}
                  {stats.aiCalls} zapytań
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {byModel.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak zapytań AI
                </p>
              ) : (
                byModel.map((m) => (
                  <div
                    key={m.model}
                    className="rounded-xl bg-muted/60 px-4 py-2 text-right"
                  >
                    <p className="text-sm font-bold text-foreground">
                      {fmtUsd(m.costUsd)}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.model}</p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {m.calls} zapytań
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

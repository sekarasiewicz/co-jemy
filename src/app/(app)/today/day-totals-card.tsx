import { Card, CardContent } from "@/components/ui";
import type { Nutrition } from "@/lib/nutrition";

export function DayTotalsCard({ totals }: { totals: Nutrition }) {
  return (
    <Card className="mb-6 max-w-3xl mx-auto">
      <CardContent className="py-4">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="rounded-xl bg-primary/10 py-2">
            <p className="text-2xl font-extrabold text-primary">
              {Math.round(totals.calories)}
            </p>
            <p className="text-xs font-medium text-muted-foreground">kcal</p>
          </div>
          <div className="rounded-xl bg-fit/15 py-2">
            <p className="text-2xl font-extrabold text-lime-700 dark:text-lime-400">
              {Math.round(totals.protein)}g
            </p>
            <p className="text-xs font-medium text-muted-foreground">białko</p>
          </div>
          <div className="rounded-xl bg-amber-500/12 py-2">
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {Math.round(totals.carbs)}g
            </p>
            <p className="text-xs font-medium text-muted-foreground">węgle</p>
          </div>
          <div className="rounded-xl bg-sky-500/12 py-2">
            <p className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">
              {Math.round(totals.fat)}g
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              tłuszcze
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

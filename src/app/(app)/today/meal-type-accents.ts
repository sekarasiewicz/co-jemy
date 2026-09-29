// Distinct accent per meal type so the day cards don't blend together.
const MEAL_TYPE_ACCENTS: Record<string, { bar: string; text: string }> = {
  Śniadanie: {
    bar: "border-t-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  "II śniadanie": {
    bar: "border-t-lime-500",
    text: "text-lime-600 dark:text-lime-400",
  },
  Obiad: {
    bar: "border-t-orange-500",
    text: "text-orange-600 dark:text-orange-400",
  },
  Podwieczorek: {
    bar: "border-t-rose-500",
    text: "text-rose-600 dark:text-rose-400",
  },
  Kolacja: { bar: "border-t-sky-500", text: "text-sky-600 dark:text-sky-400" },
  Przekąska: {
    bar: "border-t-violet-500",
    text: "text-violet-600 dark:text-violet-400",
  },
};

const FALLBACK_ACCENTS = [
  { bar: "border-t-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { bar: "border-t-lime-500", text: "text-lime-600 dark:text-lime-400" },
  { bar: "border-t-sky-500", text: "text-sky-600 dark:text-sky-400" },
  { bar: "border-t-violet-500", text: "text-violet-600 dark:text-violet-400" },
  { bar: "border-t-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { bar: "border-t-rose-500", text: "text-rose-600 dark:text-rose-400" },
];

export function getMealTypeAccent(name: string, index: number) {
  return (
    MEAL_TYPE_ACCENTS[name] ?? FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length]
  );
}

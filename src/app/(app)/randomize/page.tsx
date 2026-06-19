import { Shuffle } from "lucide-react";
import { getMealTypesAction, getTagsAction } from "@/app/actions/tags";
import { Randomizer } from "./randomizer";

export default async function RandomizePage() {
  const [mealTypes, tags] = await Promise.all([
    getMealTypesAction(),
    getTagsAction(),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <span className="bg-brand-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-warm-lg">
          <Shuffle className="h-8 w-8" />
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
          Co <span className="text-gradient-brand">jemy?</span>
        </h1>
        <p className="text-muted-foreground">
          Wylosuj danie na podstawie swoich preferencji
        </p>
      </div>

      <Randomizer mealTypes={mealTypes} tags={tags} />
    </div>
  );
}

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
        <h1 className="text-3xl font-bold text-foreground mb-2">Co jemy?</h1>
        <p className="text-muted-foreground">
          Wylosuj danie na podstawie swoich preferencji
        </p>
      </div>

      <Randomizer mealTypes={mealTypes} tags={tags} />
    </div>
  );
}

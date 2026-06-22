"use client";

import { useState } from "react";
import { Button, Checkbox, ImageUpload, Input, Select } from "@/components/ui";
import { ACTIVITY_LEVELS, calculateNutritionGoals, cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { PROFILE_COLORS } from "@/types";
import { ProfileAvatar } from "./profile-avatar";

interface ProfileFormProps {
  profile?: Profile;
  onSubmit: (data: {
    name: string;
    avatar?: string;
    color: string;
    height: number | null;
    weight: number | null;
    age: number | null;
    sex: string | null;
    activityLevel: string;
    autoCalorieGoal: boolean;
    dailyCalorieGoal: number;
    dailyProteinGoal: number;
    dailyCarbsGoal: number;
    dailyFatGoal: number;
    isChild: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
}

const SEX_OPTIONS = [
  { value: "male", label: "Mężczyzna" },
  { value: "female", label: "Kobieta" },
];

// "" when input blank, else parsed int
const toNum = (s: string): number | null => {
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};

const AVATARS = ["👨", "👩", "👦", "👧", "👴", "👵", "🧑", "👶"];

export function ProfileForm({ profile, onSubmit, onCancel }: ProfileFormProps) {
  const [name, setName] = useState(profile?.name || "");
  const [avatar, setAvatar] = useState(profile?.avatar || "");
  const [color, setColor] = useState(profile?.color || PROFILE_COLORS[0]);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(
    profile?.dailyCalorieGoal || 2000,
  );
  const [dailyProteinGoal, setDailyProteinGoal] = useState(
    profile?.dailyProteinGoal || 50,
  );
  const [dailyCarbsGoal, setDailyCarbsGoal] = useState(
    profile?.dailyCarbsGoal || 250,
  );
  const [dailyFatGoal, setDailyFatGoal] = useState(profile?.dailyFatGoal || 65);
  const [isChild, setIsChild] = useState(profile?.isChild || false);
  const [height, setHeight] = useState(profile?.height?.toString() ?? "");
  const [weight, setWeight] = useState(profile?.weight?.toString() ?? "");
  const [age, setAge] = useState(profile?.age?.toString() ?? "");
  const [sex, setSex] = useState(profile?.sex ?? "");
  const [activityLevel, setActivityLevel] = useState(
    profile?.activityLevel ?? "moderate",
  );
  const [autoCalorieGoal, setAutoCalorieGoal] = useState(
    profile?.autoCalorieGoal ?? false,
  );
  const [loading, setLoading] = useState(false);

  const computedGoals = calculateNutritionGoals({
    height: toNum(height),
    weight: toNum(weight),
    age: toNum(age),
    sex: sex || null,
    activityLevel,
  });
  const auto = autoCalorieGoal && computedGoals !== null;
  const effectiveCalorieGoal = auto ? computedGoals.calories : dailyCalorieGoal;
  const effectiveProteinGoal = auto ? computedGoals.protein : dailyProteinGoal;
  const effectiveCarbsGoal = auto ? computedGoals.carbs : dailyCarbsGoal;
  const effectiveFatGoal = auto ? computedGoals.fat : dailyFatGoal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        name,
        avatar: avatar || undefined,
        color,
        height: toNum(height),
        weight: toNum(weight),
        age: toNum(age),
        sex: sex || null,
        activityLevel,
        autoCalorieGoal,
        dailyCalorieGoal: effectiveCalorieGoal,
        dailyProteinGoal: effectiveProteinGoal,
        dailyCarbsGoal: effectiveCarbsGoal,
        dailyFatGoal: effectiveFatGoal,
        isChild,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-center">
        <ProfileAvatar
          name={name || "?"}
          avatar={avatar}
          color={color}
          size="xl"
        />
      </div>

      <Input
        label="Imię"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="np. Mama, Tata, Zuzia"
        required
      />

      <ImageUpload
        label="Zdjęcie profilu"
        value={
          avatar && (avatar.startsWith("http") || avatar.startsWith("/"))
            ? avatar
            : ""
        }
        onChange={setAvatar}
        folder="profiles"
        aspect="square"
        className="max-w-48"
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          lub wybierz emoji
        </label>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(avatar === emoji ? "" : emoji)}
              className={cn(
                "w-10 h-10 text-xl rounded-lg border-2 transition-colors",
                avatar === emoji
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-border hover:border-muted-foreground",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Kolor
        </label>
        <div className="flex flex-wrap gap-2">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "w-8 h-8 rounded-full transition-transform",
                color === c &&
                  "ring-2 ring-offset-2 ring-offset-background ring-ring scale-110",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <Checkbox
        label="Profil dziecka (pokaże dania przyjazne dzieciom)"
        checked={isChild}
        onChange={(e) => setIsChild(e.target.checked)}
      />

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium text-foreground mb-3">
          Dane ciała
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Wzrost (cm)"
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            min={50}
            max={250}
            placeholder="np. 175"
          />
          <Input
            label="Waga (kg)"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min={10}
            max={300}
            placeholder="np. 70"
          />
          <Input
            label="Wiek (lata)"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={1}
            max={120}
            placeholder="np. 30"
          />
          <Select
            label="Płeć"
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            options={SEX_OPTIONS}
            placeholder="Wybierz..."
          />
        </div>
        <div className="mt-4">
          <Select
            label="Poziom aktywności"
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            options={ACTIVITY_LEVELS.map((l) => ({
              value: l.value,
              label: l.label,
            }))}
          />
        </div>
        <div className="mt-4">
          <Checkbox
            label="Automatycznie licz cel kaloryczny (BMR)"
            checked={autoCalorieGoal}
            onChange={(e) => setAutoCalorieGoal(e.target.checked)}
          />
          {autoCalorieGoal && computedGoals === null && (
            <p className="mt-1 text-sm text-muted-foreground">
              Uzupełnij wzrost, wagę, wiek i płeć, aby policzyć cele.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium text-foreground mb-3">
          Dzienne cele żywieniowe
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Kalorie (kcal)"
            type="number"
            value={autoCalorieGoal ? effectiveCalorieGoal : dailyCalorieGoal}
            onChange={(e) => setDailyCalorieGoal(Number(e.target.value))}
            min={500}
            max={5000}
            disabled={autoCalorieGoal}
          />
          <Input
            label="Białko (g)"
            type="number"
            value={auto ? effectiveProteinGoal : dailyProteinGoal}
            onChange={(e) => setDailyProteinGoal(Number(e.target.value))}
            min={10}
            max={300}
            disabled={autoCalorieGoal}
          />
          <Input
            label="Węglowodany (g)"
            type="number"
            value={auto ? effectiveCarbsGoal : dailyCarbsGoal}
            onChange={(e) => setDailyCarbsGoal(Number(e.target.value))}
            min={50}
            max={500}
            disabled={autoCalorieGoal}
          />
          <Input
            label="Tłuszcze (g)"
            type="number"
            value={auto ? effectiveFatGoal : dailyFatGoal}
            onChange={(e) => setDailyFatGoal(Number(e.target.value))}
            min={20}
            max={200}
            disabled={autoCalorieGoal}
          />
        </div>
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Anuluj
          </Button>
        )}
        <Button type="submit" loading={loading} className="flex-1">
          {profile ? "Zapisz zmiany" : "Dodaj profil"}
        </Button>
      </div>
    </form>
  );
}

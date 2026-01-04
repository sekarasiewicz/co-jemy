"use client";

import { useState } from "react";
import { Button, Checkbox, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { PROFILE_COLORS } from "@/types";
import { ProfileAvatar } from "./profile-avatar";

interface ProfileFormProps {
  profile?: Profile;
  onSubmit: (data: {
    name: string;
    avatar?: string;
    color: string;
    dailyCalorieGoal: number;
    dailyProteinGoal: number;
    dailyCarbsGoal: number;
    dailyFatGoal: number;
    isChild: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
}

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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        name,
        avatar: avatar || undefined,
        color,
        dailyCalorieGoal,
        dailyProteinGoal,
        dailyCarbsGoal,
        dailyFatGoal,
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

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Avatar
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
                  ? "border-emerald-500 bg-emerald-500/10"
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
          Dzienne cele żywieniowe
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Kalorie (kcal)"
            type="number"
            value={dailyCalorieGoal}
            onChange={(e) => setDailyCalorieGoal(Number(e.target.value))}
            min={500}
            max={5000}
          />
          <Input
            label="Białko (g)"
            type="number"
            value={dailyProteinGoal}
            onChange={(e) => setDailyProteinGoal(Number(e.target.value))}
            min={10}
            max={300}
          />
          <Input
            label="Węglowodany (g)"
            type="number"
            value={dailyCarbsGoal}
            onChange={(e) => setDailyCarbsGoal(Number(e.target.value))}
            min={50}
            max={500}
          />
          <Input
            label="Tłuszcze (g)"
            type="number"
            value={dailyFatGoal}
            onChange={(e) => setDailyFatGoal(Number(e.target.value))}
            min={20}
            max={200}
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

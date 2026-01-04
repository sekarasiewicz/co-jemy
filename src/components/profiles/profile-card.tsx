"use client";

import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { ProfileAvatar } from "./profile-avatar";

interface ProfileCardProps {
  profile: Profile;
  onClick: () => void;
  selected?: boolean;
}

export function ProfileCard({ profile, onClick, selected }: ProfileCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 p-4 rounded-xl transition-all",
        "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500",
        selected && "ring-2 ring-emerald-500",
      )}
    >
      <ProfileAvatar
        name={profile.name}
        avatar={profile.avatar}
        color={profile.color}
        size="xl"
      />
      <span className="text-lg font-medium text-foreground">{profile.name}</span>
      {profile.isChild && (
        <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
          Dziecko
        </span>
      )}
    </button>
  );
}

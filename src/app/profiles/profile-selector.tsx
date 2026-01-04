"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileCard } from "@/components/profiles/profile-card";
import { useProfile } from "@/contexts/profile-context";
import type { Profile } from "@/types";

interface ProfileSelectorProps {
  profiles: Profile[];
}

export function ProfileSelector({ profiles }: ProfileSelectorProps) {
  const router = useRouter();
  const { setActiveProfile, setProfiles } = useProfile();

  const handleSelectProfile = (profile: Profile) => {
    setProfiles(profiles);
    setActiveProfile(profile);
    router.push("/today");
  };

  return (
    <div className="flex flex-wrap justify-center gap-6 max-w-2xl">
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          onClick={() => handleSelectProfile(profile)}
        />
      ))}

      {profiles.length < 6 && (
        <Link
          href="/profiles/manage?create=true"
          className="flex flex-col items-center gap-3 p-4 rounded-xl transition-all hover:scale-105"
        >
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <Plus className="w-10 h-10 text-muted-foreground" />
          </div>
          <span className="text-lg font-medium text-muted-foreground">
            Dodaj profil
          </span>
        </Link>
      )}
    </div>
  );
}

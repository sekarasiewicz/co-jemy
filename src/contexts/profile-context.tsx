"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Profile } from "@/types";

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  setProfiles: (profiles: Profile[]) => void;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const ACTIVE_PROFILE_KEY = "co-jemy-active-profile";

export function ProfileProvider({
  children,
  initialProfiles = [],
}: {
  children: React.ReactNode;
  initialProfiles?: Profile[];
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY);

    if (savedProfileId && profiles.length > 0) {
      const found = profiles.find((p) => p.id === savedProfileId);
      if (found) {
        setActiveProfileState(found);
      } else {
        setActiveProfileState(profiles[0]);
      }
    } else if (profiles.length > 0) {
      setActiveProfileState(profiles[0]);
    }

    setIsLoading(false);
  }, [profiles]);

  const setActiveProfile = useCallback((profile: Profile) => {
    setActiveProfileState(profile);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        setActiveProfile,
        setProfiles,
        isLoading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

export function useActiveProfile() {
  const { activeProfile } = useProfile();
  return activeProfile;
}

export function useProfiles() {
  const { profiles } = useProfile();
  return profiles;
}

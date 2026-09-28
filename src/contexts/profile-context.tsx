"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/profile-cookie";
import type { Profile } from "@/types";

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  setProfiles: (profiles: Profile[]) => void;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Legacy storage; the cookie is the source of truth (the server reads it).
const ACTIVE_PROFILE_KEY = "co-jemy-active-profile";

function persistActiveProfile(profileId: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: plain first-party preference cookie
  document.cookie = `${ACTIVE_PROFILE_COOKIE}=${encodeURIComponent(profileId)}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } catch {
    // storage unavailable — the cookie is enough
  }
}

const NO_PROFILES: Profile[] = [];

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function readLegacyChoice(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch {
    return null;
  }
}

function pickActive(profiles: Profile[], id: string | null | undefined) {
  return profiles.find((p) => p.id === id) ?? profiles[0] ?? null;
}

export function ProfileProvider({
  children,
  initialProfiles = NO_PROFILES,
  initialActiveProfileId,
}: {
  children: React.ReactNode;
  initialProfiles?: Profile[];
  /** From the active-profile cookie, so the first render already has it. */
  initialActiveProfileId?: string | null;
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(() =>
    pickActive(initialProfiles, initialActiveProfileId),
  );
  const [isLoading, setIsLoading] = useState(initialProfiles.length === 0);

  // Server re-renders (router.refresh after editing profiles) pass new props.
  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  // Keep the active profile valid when the list changes; migrate a choice
  // saved only in localStorage (before the cookie existed) on first run.
  useEffect(() => {
    if (profiles.length === 0) return;
    // The cookie wins: another provider (the /profiles picker) may have
    // changed it after this one's initial props were rendered.
    const saved = readCookie(ACTIVE_PROFILE_COOKIE) ?? readLegacyChoice();
    setActiveProfileState((current) => {
      const preferred = saved ?? current?.id;
      const next = pickActive(profiles, preferred);
      if (next && next.id !== saved) persistActiveProfile(next.id);
      return next;
    });
    setIsLoading(false);
  }, [profiles]);

  const setActiveProfile = useCallback((profile: Profile) => {
    setActiveProfileState(profile);
    persistActiveProfile(profile.id);
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

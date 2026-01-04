"use client";

import { useEffect } from "react";
import { useProfile } from "@/contexts/profile-context";
import type { Profile } from "@/types";

interface AppLayoutClientProps {
  profiles: Profile[];
  children: React.ReactNode;
}

export function AppLayoutClient({ profiles, children }: AppLayoutClientProps) {
  const { setProfiles } = useProfile();

  useEffect(() => {
    setProfiles(profiles);
  }, [profiles, setProfiles]);

  return <>{children}</>;
}

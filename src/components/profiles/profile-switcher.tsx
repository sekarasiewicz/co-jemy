"use client";

import { ChevronDown, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "@/contexts/profile-context";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "./profile-avatar";

export function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!activeProfile) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <ProfileAvatar
          name={activeProfile.name}
          avatar={activeProfile.avatar}
          color={activeProfile.color}
          size="sm"
        />
        <span className="text-sm font-medium text-foreground hidden sm:block">
          {activeProfile.name}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-popover rounded-xl shadow-lg border border-border py-2 z-50">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
            Zmień profil
          </div>

          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                setActiveProfile(profile);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50",
                profile.id === activeProfile.id && "bg-emerald-500/10",
              )}
            >
              <ProfileAvatar
                name={profile.name}
                avatar={profile.avatar}
                color={profile.color}
                size="sm"
              />
              <span className="text-sm font-medium text-foreground">
                {profile.name}
              </span>
              {profile.isChild && (
                <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                  dziecko
                </span>
              )}
            </button>
          ))}

          <div className="border-t border-border mt-2 pt-2">
            <Link
              href="/profiles/manage"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50"
            >
              <Settings className="w-4 h-4" />
              Zarządzaj profilami
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

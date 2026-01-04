"use client";

import { ProfileProvider } from "@/contexts/profile-context";
import { ThemeProvider } from "@/contexts/theme-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ProfileProvider>{children}</ProfileProvider>
    </ThemeProvider>
  );
}

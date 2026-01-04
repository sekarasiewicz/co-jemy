"use client";

import { Toaster } from "sonner";
import { ProfileProvider } from "@/contexts/profile-context";
import { ThemeProvider, useTheme } from "@/contexts/theme-context";

function ToasterWithTheme() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={theme}
      toastOptions={{
        style: {
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--foreground))",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ProfileProvider>
        {children}
        <ToasterWithTheme />
      </ProfileProvider>
    </ThemeProvider>
  );
}

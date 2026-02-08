"use client";

import {
  Apple,
  Calendar,
  Home,
  LogOut,
  ShoppingCart,
  Shuffle,
  User,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/contexts/profile-context";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { ProfileSwitcher } from "./profiles/profile-switcher";

const navItems = [
  { href: "/today", label: "Dziś", icon: Home },
  { href: "/meals", label: "Dania", icon: UtensilsCrossed },
  { href: "/ingredients", label: "Składniki", icon: Apple },
  { href: "/randomize", label: "Losuj", icon: Shuffle },
  { href: "/planner", label: "Planer", icon: Calendar },
  { href: "/shopping", label: "Zakupy", icon: ShoppingCart },
];

export function Navbar() {
  const pathname = usePathname();
  const { activeProfile } = useProfile();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/auth/login";
  };

  return (
    <nav className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span className="font-bold text-xl text-foreground">
                co jemy?
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeProfile && <ProfileSwitcher />}

            <ModeToggle />

            <Link
              href="/profiles/manage"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            >
              <User className="w-5 h-5" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-border">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium",
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

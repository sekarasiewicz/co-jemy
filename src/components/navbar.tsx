"use client";

import {
  Apple,
  Calendar,
  ChefHat,
  Home,
  LogOut,
  Shield,
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

export function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { activeProfile } = useProfile();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/auth/login";
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-warm transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-6">
                <ChefHat className="h-5 w-5" />
              </span>
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                co <span className="text-gradient-brand">jemy?</span>
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
                      "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeProfile && <ProfileSwitcher />}

            <ModeToggle />

            {isAdmin && (
              <Link
                href="/admin"
                title="Panel admina"
                className={cn(
                  "rounded-full p-2 transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Shield className="w-5 h-5" />
              </Link>
            )}

            <Link
              href="/profiles/manage"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <User className="w-5 h-5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="flex justify-around py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-primary/12",
                  )}
                >
                  <Icon className="w-5 h-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

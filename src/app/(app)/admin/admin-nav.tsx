"use client";

import {
  BarChart3,
  Database,
  Sparkles,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Przegląd", icon: BarChart3, exact: true },
  { href: "/admin/users", label: "Użytkownicy", icon: UsersRound },
  { href: "/admin/content", label: "Treści", icon: UtensilsCrossed },
  { href: "/admin/ai", label: "AI i koszty", icon: Sparkles },
  { href: "/admin/system", label: "System", icon: Database },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

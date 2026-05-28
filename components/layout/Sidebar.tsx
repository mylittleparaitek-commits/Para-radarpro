"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Mail, Settings, TrendingUp, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/trends", label: "Tendances", icon: TrendingUp },
  { href: "/newsletter", label: "Newsletter", icon: Mail },
  { href: "/settings", label: "Paramètres", icon: Settings },
] as const;

const ADMIN_NAV = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden border-r bg-card md:flex md:w-60 md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6 font-semibold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-blue-600 text-white">
          <BarChart3 className="h-4 w-4" />
        </span>
        ParaRadar Pro
      </div>
      <nav className="flex-1 space-y-1 p-3 text-sm">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <>
            <div className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Admin
            </div>
            {ADMIN_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}

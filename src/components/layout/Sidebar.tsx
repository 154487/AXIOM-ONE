"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  FileUp,
  TrendingUp,
  BookOpen,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations("Sidebar");

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/transactions", label: t("transactions"), icon: Receipt },
    { href: "/reports", label: t("reports"), icon: BarChart3 },
    { href: "/import", label: t("import"), icon: FileUp },
    { href: "/investments", label: t("investments"), icon: TrendingUp },
    { href: "/journal", label: t("journal"), icon: BookOpen },
    { href: "/settings", label: t("settings"), icon: Settings2 },
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-axiom-bg border-r border-axiom-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-48"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 p-4 mb-2", collapsed && "justify-center")}>
        <div className="w-8 h-8 bg-axiom-primary rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-sm tracking-wide">AXIOM ONE</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-axiom-primary text-white"
                  : "text-axiom-muted hover:bg-axiom-hover hover:text-white"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-axiom-card border border-axiom-border rounded-full flex items-center justify-center text-axiom-muted hover:text-white transition-colors z-10"
        aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}

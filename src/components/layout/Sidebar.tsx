"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart2,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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

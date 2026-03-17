"use client";

import { usePathname } from "next/navigation";
import { Moon, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Financial Overview",
  "/transactions": "Transactions",
  "/reports": "Financial Reports",
  "/import": "Import OFX File",
  "/settings": "Settings",
};

interface TopbarProps {
  userName?: string | null;
}

export function Topbar({ userName }: TopbarProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Financial Overview";
  const initial = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-axiom-border">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-axiom-muted text-sm">Welcome back to AXIOM ONE</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle — decorative in v0.1 */}
        <button className="w-9 h-9 flex items-center justify-center rounded-full text-axiom-muted hover:text-white hover:bg-axiom-hover transition-colors">
          <Moon size={18} />
        </button>

        {/* Notifications — decorative in v0.1 */}
        <button className="w-9 h-9 flex items-center justify-center rounded-full text-axiom-muted hover:text-white hover:bg-axiom-hover transition-colors">
          <Bell size={18} />
        </button>

        {/* User avatar */}
        <Avatar className="w-9 h-9 bg-axiom-primary">
          <AvatarFallback className="bg-axiom-primary text-white font-semibold text-sm">
            {initial}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

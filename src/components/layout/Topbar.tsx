"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Moon, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TopbarProps {
  userName?: string | null;
}

export function Topbar({ userName }: TopbarProps) {
  const pathname = usePathname();
  const t = useTranslations("Topbar");
  const title = t(`pageTitles.${pathname}` as Parameters<typeof t>[0]) ?? t("pageTitles./dashboard");
  const initial = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-axiom-border">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-axiom-muted text-sm">{t("subtitle")}</p>
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

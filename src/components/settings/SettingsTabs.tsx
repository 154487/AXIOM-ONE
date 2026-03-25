"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "./ProfileForm";
import { CategoriesManager } from "./CategoriesManager";
import { useTranslations } from "next-intl";
import type { Category } from "@/generated/prisma/client";

interface SettingsTabsProps {
  user: { id: string; name: string | null; email: string };
  categories: Category[];
}

export function SettingsTabs({ user, categories }: SettingsTabsProps) {
  const t = useTranslations("Settings");

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="bg-axiom-hover rounded-lg p-1 gap-1 mb-6">
        <TabsTrigger
          value="profile"
          className="data-active:bg-axiom-primary data-active:text-white text-axiom-muted"
        >
          {t("tabProfile")}
        </TabsTrigger>
        <TabsTrigger
          value="categories"
          className="data-active:bg-axiom-primary data-active:text-white text-axiom-muted"
        >
          {t("tabCategories")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileForm user={user} />
      </TabsContent>

      <TabsContent value="categories">
        <CategoriesManager initialCategories={categories} />
      </TabsContent>
    </Tabs>
  );
}

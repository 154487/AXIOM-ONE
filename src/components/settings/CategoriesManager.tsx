"use client";

import type { Category } from "@/generated/prisma/client";

interface CategoriesManagerProps {
  initialCategories: Category[];
}

// Implementado na issue #9
export function CategoriesManager({ initialCategories: _ }: CategoriesManagerProps) {
  return null;
}

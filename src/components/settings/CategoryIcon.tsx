"use client";

import type { LucideProps } from "lucide-react";
import {
  Home,
  UtensilsCrossed,
  Coffee,
  Pizza,
  Car,
  Bus,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Heart,
  Activity,
  Pill,
  Music,
  Film,
  Gamepad2,
  BookOpen,
  GraduationCap,
  Dumbbell,
  PawPrint,
  Briefcase,
  Building2,
  CreditCard,
  Wallet,
  DollarSign,
  Gift,
  Zap,
  Wifi,
  Smartphone,
  Shirt,
  Tag,
} from "lucide-react";
import type { FC } from "react";

const ICON_MAP: Record<string, FC<LucideProps>> = {
  home: Home,
  "utensils-crossed": UtensilsCrossed,
  coffee: Coffee,
  pizza: Pizza,
  car: Car,
  bus: Bus,
  plane: Plane,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  heart: Heart,
  activity: Activity,
  pill: Pill,
  music: Music,
  film: Film,
  "gamepad-2": Gamepad2,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  briefcase: Briefcase,
  "building-2": Building2,
  "credit-card": CreditCard,
  wallet: Wallet,
  "dollar-sign": DollarSign,
  gift: Gift,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  shirt: Shirt,
  tag: Tag,
};

interface CategoryIconProps extends LucideProps {
  name: string;
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const Icon = ICON_MAP[name.toLowerCase()];
  if (!Icon) return null;
  return <Icon {...props} />;
}

export const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: "home", label: "Casa" },
  { name: "utensils-crossed", label: "Alimentação" },
  { name: "coffee", label: "Café" },
  { name: "pizza", label: "Restaurante" },
  { name: "car", label: "Carro" },
  { name: "bus", label: "Transporte" },
  { name: "plane", label: "Viagem" },
  { name: "shopping-bag", label: "Compras" },
  { name: "shopping-cart", label: "Mercado" },
  { name: "heart", label: "Saúde" },
  { name: "activity", label: "Atividade" },
  { name: "pill", label: "Remédio" },
  { name: "music", label: "Música" },
  { name: "film", label: "Cinema" },
  { name: "gamepad-2", label: "Jogos" },
  { name: "book-open", label: "Educação" },
  { name: "graduation-cap", label: "Faculdade" },
  { name: "dumbbell", label: "Academia" },
  { name: "paw-print", label: "Pet" },
  { name: "briefcase", label: "Trabalho" },
  { name: "building-2", label: "Empresa" },
  { name: "credit-card", label: "Cartão" },
  { name: "wallet", label: "Carteira" },
  { name: "dollar-sign", label: "Dinheiro" },
  { name: "gift", label: "Presente" },
  { name: "zap", label: "Energia" },
  { name: "wifi", label: "Internet" },
  { name: "smartphone", label: "Celular" },
  { name: "shirt", label: "Roupas" },
  { name: "tag", label: "Outro" },
];

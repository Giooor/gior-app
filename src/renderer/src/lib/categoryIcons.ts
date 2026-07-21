import {
  Wallet,
  ShoppingCart,
  Home,
  Car,
  Utensils,
  HeartPulse,
  Film,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Zap,
  Dog,
  Dumbbell,
  Smartphone,
  Coffee,
  BookOpen,
  MoreHorizontal
} from 'lucide-react'
import type { CategoryIcon } from '../../../shared/ledger'

export const CATEGORY_ICON_COMPONENT: Record<CategoryIcon, typeof Wallet> = {
  wallet: Wallet,
  'shopping-cart': ShoppingCart,
  home: Home,
  car: Car,
  utensils: Utensils,
  'heart-pulse': HeartPulse,
  film: Film,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  plane: Plane,
  gift: Gift,
  zap: Zap,
  dog: Dog,
  dumbbell: Dumbbell,
  smartphone: Smartphone,
  coffee: Coffee,
  'book-open': BookOpen,
  'more-horizontal': MoreHorizontal
}

export const CATEGORY_COLOR_HEX: Record<string, string> = {
  indigo: '#6366f1',
  rose: '#fb7185',
  amber: '#fbbf24',
  emerald: '#34d399',
  sky: '#38bdf8',
  violet: '#a78bfa',
  slate: '#94a3b8'
}

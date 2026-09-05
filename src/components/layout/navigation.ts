import { Clock3, UserRound, WandSparkles, type LucideIcon } from 'lucide-react'

export interface AppNavItem {
  path: '/generator' | '/profile' | '/history'
  label: string
  shortLabel: string
  Icon: LucideIcon
}

/** The product has three durable destinations; keep their labels in one place. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { path: '/generator', label: 'Generator', shortLabel: 'Generate', Icon: WandSparkles },
  { path: '/profile', label: 'Profile', shortLabel: 'Profile', Icon: UserRound },
  { path: '/history', label: 'History', shortLabel: 'History', Icon: Clock3 },
]

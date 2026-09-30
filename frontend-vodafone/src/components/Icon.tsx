import {
  Building2,
  CardSim,
  CircleUserRound,
  Gauge,
  Heart,
  House,
  MessageCircle,
  RadioTower,
  Receipt,
  Router,
  ShoppingBag,
  Smartphone,
  Star,
  Wallet,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons editors can pick by name in Quick Links, Service Carousel and Feature
 * Grid items. Keep in sync with ICONS in docs/build-vodafone.py.
 */
const ICONS: Record<string, LucideIcon> = {
  account: CircleUserRound,
  shop: ShoppingBag,
  store: Building2,
  contact: MessageCircle,
  plans: CardSim,
  bill: Receipt,
  cash: Wallet,
  dsl: House,
  internet: Gauge,
  app: Smartphone,
  router: Router,
  "4g": RadioTower,
  wifi: Wifi,
  family: Heart,
  star: Star,
};

export function Icon({ name, className = "h-8 w-8" }: { name?: string; className?: string }) {
  const Glyph = (name && ICONS[name.toLowerCase()]) || Star;
  return <Glyph aria-hidden className={className} strokeWidth={1.5} />;
}

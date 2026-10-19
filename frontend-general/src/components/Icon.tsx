import {
  Accessibility,
  Bike,
  Building2,
  Bus,
  CalendarDays,
  Car,
  Clock,
  Heart,
  Info,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Sun,
  Ticket,
  TrainFront,
  Users,
  type LucideIcon,
} from "lucide-react";

// The icon names editors can type in a Feature Grid's items. Keep in sync
// with ICON_HINT in docs/build-general.py.
const ICONS: Record<string, LucideIcon> = {
  metro: TrainFront,
  car: Car,
  bus: Bus,
  bike: Bike,
  ticket: Ticket,
  clock: Clock,
  map: MapPin,
  accessibility: Accessibility,
  leaf: Leaf,
  sun: Sun,
  users: Users,
  building: Building2,
  sparkles: Sparkles,
  heart: Heart,
  calendar: CalendarDays,
  info: Info,
  phone: Phone,
  mail: Mail,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Component = ICONS[name.toLowerCase()] ?? Sparkles;
  return <Component aria-hidden className={className} />;
}

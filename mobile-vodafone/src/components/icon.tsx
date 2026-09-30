import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue } from "react-native";

type SFSymbol = Extract<SymbolViewProps["name"], string>;

/**
 * Icons editors pick by name in dotCMS (Quick Links, services, feature
 * grids), drawn as SF Symbols. Same names as the website's Icon component.
 */
const SYMBOLS: Record<string, SFSymbol> = {
  account: "person.crop.circle",
  shop: "bag",
  store: "building.2",
  contact: "bubble.left",
  plans: "simcard",
  cash: "wallet.bifold",
  dsl: "house",
  internet: "gauge.with.dots.needle.67percent",
  app: "iphone",
  router: "wifi.router",
  "4g": "antenna.radiowaves.left.and.right",
  wifi: "wifi",
  family: "heart",
  star: "star",
  bill: "doc.text",
  // Used by the app itself, not offered to editors.
  plus: "plus",
  minus: "minus",
};

export function Icon({ name, size = 28, color }: { name?: string; size?: number; color: ColorValue }) {
  return <SymbolView name={SYMBOLS[name?.toLowerCase() ?? ""] ?? "star"} size={size} tintColor={color} />;
}

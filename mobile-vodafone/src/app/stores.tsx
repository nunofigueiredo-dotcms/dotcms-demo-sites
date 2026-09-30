import { useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Header } from "@/components/header";
import { Screen } from "@/components/screen";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useDotCMS } from "@/hooks/use-dotcms";
import { checkboxValues } from "@/lib/content";
import { fetchStores } from "@/lib/queries";
import type { Store } from "@/lib/types";

const SERVICES: Record<string, string> = {
  cash: "Vodafone Cash",
  lines: "Lines",
  devices: "Devices",
  dsl: "Home DSL",
  business: "Business",
};
// Largest markets first, then A–Z.
const FIRST = ["Cairo", "Giza", "Alexandria"];
const rank = (g: string) => (FIRST.includes(g) ? FIRST.indexOf(g) : FIRST.length);
const EGYPT = { latitude: 27.3, longitude: 30.8, latitudeDelta: 11, longitudeDelta: 11 };

export default function StoresScreen() {
  const { data: stores = [], error, loading, refreshing, refresh } = useDotCMS(fetchStores);
  const [governorate, setGovernorate] = useState("all");
  const [selected, setSelected] = useState<string>();
  const map = useRef<MapView>(null);

  const governorates = useMemo(
    () => [...new Set(stores.map((s) => s.governorate))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)),
    [stores]
  );
  const shown = useMemo(
    () =>
      stores
        .filter((s) => governorate === "all" || s.governorate === governorate)
        .sort((a, b) => rank(a.governorate) - rank(b.governorate) || a.title.localeCompare(b.title)),
    [stores, governorate]
  );

  function focus(store: Store) {
    setSelected(store.identifier);
    map.current?.animateToRegion(
      { latitude: Number(store.latitude), longitude: Number(store.longitude), latitudeDelta: 0.05, longitudeDelta: 0.05 },
      500
    );
  }

  function pickGovernorate(g: string) {
    setGovernorate(g);
    setSelected(undefined);
    const inArea = stores.filter((s) => g === "all" || s.governorate === g);
    map.current?.fitToCoordinates(
      inArea.map((s) => ({ latitude: Number(s.latitude), longitude: Number(s.longitude) })),
      { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true }
    );
  }

  return (
    <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
      <Header title="Store Locator" />
      <MapView ref={map} style={styles.map} initialRegion={EGYPT}>
        {shown.map((s) => (
          <Marker
            key={s.identifier}
            coordinate={{ latitude: Number(s.latitude), longitude: Number(s.longitude) }}
            title={s.title}
            description={s.address}
            pinColor={Colors.red}
            onPress={() => setSelected(s.identifier)}
          />
        ))}
      </MapView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {["all", ...governorates].map((g) => (
          <Pressable key={g} style={[styles.chip, governorate === g && styles.chipActive]} onPress={() => pickGovernorate(g)}>
            <Text style={[styles.chipText, governorate === g && styles.chipTextActive]}>{g === "all" ? "All of Egypt" : g}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.count}>
        {shown.length} {shown.length === 1 ? "store" : "stores"}
      </Text>
      {shown.map((store) => (
        <Pressable
          key={store.identifier}
          style={[styles.card, selected === store.identifier && styles.cardSelected]}
          onPress={() => focus(store)}
        >
          <Text style={styles.type}>{store.storeType.toUpperCase()}</Text>
          <Text style={styles.name}>{store.title}</Text>
          <Text style={styles.line}>
            {store.address}
            {store.area ? `, ${store.area}` : ""}
          </Text>
          {store.hours ? <Text style={styles.line}>{store.hours}</Text> : null}
          <View style={styles.services}>
            {checkboxValues(store.services).map((s) => (
              <Text key={s} style={styles.service}>
                {SERVICES[s] ?? s}
              </Text>
            ))}
          </View>
          {store.phone ? (
            <Text style={styles.phone} onPress={() => Linking.openURL(`tel:${store.phone?.replace(/[^\d+]/g, "")}`)}>
              {store.phone}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { height: 300 },
  chips: { gap: Spacing.sm, padding: Spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.silver,
  },
  chipActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  chipText: { fontSize: 14, color: Colors.charcoal },
  chipTextActive: { color: Colors.white },
  count: { fontSize: 13, color: Colors.grey, marginHorizontal: Spacing.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    gap: 4,
    borderLeftWidth: 4,
    borderLeftColor: Colors.white,
  },
  cardSelected: { borderLeftColor: Colors.red },
  type: { fontSize: 11, letterSpacing: 0.5, color: Colors.red },
  name: { fontSize: 17, color: Colors.charcoal },
  line: { fontSize: 14, color: Colors.grey },
  services: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  service: { fontSize: 12, color: Colors.grey, backgroundColor: Colors.mist, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },
  phone: { fontSize: 14, color: Colors.red, marginTop: 4 },
});

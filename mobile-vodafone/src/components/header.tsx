import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { Logo } from "./logo";

/** The white bar at the top of each tab: the Vodafone mark and a title. */
export function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Logo size={34} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  title: { flex: 1, fontSize: 20, color: Colors.charcoal },
});

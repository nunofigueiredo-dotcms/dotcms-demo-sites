import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { Colors, Spacing } from "@/constants/theme";
import { parseLines } from "@/lib/content";
import { openLink } from "@/lib/links";
import type { Contentlet } from "@/lib/types";

/** VodafoneQuickLinks: the red strip of icon shortcuts. */
export function QuickLinks({ contentlet }: { contentlet: Contentlet }) {
  const links = parseLines(contentlet.items, 3);
  return (
    <View style={styles.strip}>
      {links.map(([label, href, icon]) => (
        <Pressable key={label} style={styles.link} onPress={() => openLink(href)}>
          <Icon name={icon} color={Colors.white} size={30} />
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    backgroundColor: Colors.red,
    experimental_backgroundImage: `linear-gradient(45deg, ${Colors.redDark}, ${Colors.red})`,
    paddingVertical: Spacing.md,
  },
  link: { flex: 1, alignItems: "center", gap: Spacing.sm },
  label: { color: Colors.white, fontSize: 12, textAlign: "center" },
});

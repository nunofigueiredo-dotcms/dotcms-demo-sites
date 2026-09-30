import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { parseLines, text } from "@/lib/content";
import { openLink } from "@/lib/links";
import type { Contentlet } from "@/lib/types";

/** VodafoneFeatureGrid: cards, numbered steps or big stats. */
export function FeatureGrid({ contentlet }: { contentlet: Contentlet }) {
  const layout = text(contentlet.layout) ?? "cards";
  const red = contentlet.theme === "red";
  const rows = parseLines(contentlet.items, 4);
  const cta = text(contentlet.ctaText);
  return (
    <View style={[styles.section, red && styles.red]}>
      {text(contentlet.heading) ? <Text style={[styles.heading, red && styles.white]}>{text(contentlet.heading)}</Text> : null}
      {text(contentlet.intro) ? <Text style={styles.intro}>{text(contentlet.intro)}</Text> : null}
      <View style={styles.grid}>
        {rows.map(([title, body, , icon], i) =>
          layout === "stats" ? (
            <View key={title} style={styles.stat}>
              <Text style={styles.statValue}>{title}</Text>
              <Text style={styles.statLabel}>{body}</Text>
            </View>
          ) : (
            <View key={title} style={styles.card}>
              {layout === "steps" ? (
                <View style={styles.number}>
                  <Text style={styles.numberText}>{i + 1}</Text>
                </View>
              ) : (
                <Icon name={icon} color={Colors.red} size={28} />
              )}
              <Text style={styles.title}>{title}</Text>
              {body ? <Text style={styles.text}>{body}</Text> : null}
            </View>
          )
        )}
      </View>
      {cta ? (
        <Pressable style={styles.button} onPress={() => openLink(text(contentlet.ctaLink))}>
          <Text style={styles.buttonText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.sm },
  red: {
    backgroundColor: Colors.red,
    experimental_backgroundImage: `linear-gradient(45deg, ${Colors.redDark}, ${Colors.red})`,
  },
  heading: { fontSize: 24, color: Colors.charcoal },
  white: { color: Colors.white },
  intro: { fontSize: 15, color: Colors.grey },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.sm },
  card: {
    width: "48.5%",
    backgroundColor: Colors.white,
    borderRadius: Radius,
    padding: Spacing.md,
    gap: Spacing.sm,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  number: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.red, alignItems: "center", justifyContent: "center" },
  numberText: { color: Colors.white, fontSize: 18 },
  title: { fontSize: 16, color: Colors.charcoal },
  text: { fontSize: 13, lineHeight: 18, color: Colors.grey },
  stat: { flex: 1, minWidth: "45%", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: Radius, padding: Spacing.md, alignItems: "center" },
  statValue: { fontSize: 26, color: Colors.white },
  statLabel: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center" },
  button: {
    alignSelf: "center",
    backgroundColor: Colors.red,
    borderRadius: Radius,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  buttonText: { color: Colors.white, fontSize: 15 },
});

import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Icon } from "@/components/icon";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { parseLines, text } from "@/lib/content";
import { openLink } from "@/lib/links";
import type { Contentlet } from "@/lib/types";

/** VodafoneServiceCarousel: "Other Services", a sideways-scrolling row. */
export function ServiceList({ contentlet }: { contentlet: Contentlet }) {
  const services = parseLines(contentlet.items, 5);
  return (
    <>
      {text(contentlet.heading) ? <Text style={styles.heading}>{text(contentlet.heading)}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {services.map(([title, body, linkText, href, icon]) => (
          <Pressable key={title} style={styles.card} onPress={() => openLink(href)}>
            <Icon name={icon} color={Colors.red} size={32} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.text}>{body}</Text>
            {linkText ? <Text style={styles.link}>{linkText} ›</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, color: Colors.charcoal, marginHorizontal: Spacing.md, marginTop: Spacing.lg },
  row: { gap: Spacing.md, padding: Spacing.md },
  card: {
    width: 200,
    backgroundColor: Colors.white,
    borderRadius: Radius,
    padding: Spacing.md,
    gap: Spacing.sm,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  title: { fontSize: 17, color: Colors.charcoal },
  text: { flex: 1, fontSize: 14, lineHeight: 19, color: Colors.grey },
  link: { fontSize: 14, color: Colors.red },
});

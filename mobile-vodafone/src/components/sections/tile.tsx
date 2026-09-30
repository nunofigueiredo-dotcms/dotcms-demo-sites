import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { text } from "@/lib/content";
import { imageUrl, type ImageField } from "@/lib/dotcms";
import { openLink } from "@/lib/links";
import type { Contentlet } from "@/lib/types";

/** VodafoneTile: a white card with an image and a "Know More" link. */
export function Tile({ contentlet }: { contentlet: Contentlet }) {
  const large = contentlet.size === "large";
  const src = imageUrl(contentlet.image as ImageField, large ? 900 : 300);
  const cta = text(contentlet.ctaText);
  return (
    <Pressable style={[styles.card, !large && styles.compact]} onPress={() => openLink(text(contentlet.ctaLink))}>
      {src ? <Image source={src} style={large ? styles.imageLarge : styles.imageCompact} contentFit="cover" /> : null}
      <View style={styles.body}>
        <Text style={styles.title}>{contentlet.title}</Text>
        {text(contentlet.text) ? <Text style={styles.text}>{text(contentlet.text)}</Text> : null}
        {cta ? <Text style={styles.link}>{cta} ›</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  compact: { flexDirection: "row-reverse", gap: Spacing.md },
  imageLarge: { width: "100%", aspectRatio: 16 / 9, borderRadius: Radius, marginBottom: Spacing.md },
  imageCompact: { width: 96, height: 96, borderRadius: Radius },
  body: { flex: 1, gap: Spacing.sm },
  title: { fontSize: 20, color: Colors.charcoal },
  text: { fontSize: 14, lineHeight: 20, color: Colors.grey },
  link: { fontSize: 15, color: Colors.red },
});

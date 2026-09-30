import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { text } from "@/lib/content";
import { imageUrl, type ImageField } from "@/lib/dotcms";
import { openLink } from "@/lib/links";
import type { Contentlet } from "@/lib/types";

/** VodafoneFeatureSplit: image, then heading, text and a button. */
export function FeatureSplit({ contentlet }: { contentlet: Contentlet }) {
  const dark = contentlet.theme === "dark";
  const src = imageUrl(contentlet.image as ImageField, 900);
  const cta = text(contentlet.ctaText);
  return (
    <View style={[styles.section, dark && styles.dark]}>
      {src ? <Image source={src} style={styles.image} contentFit="cover" /> : null}
      <Text style={[styles.title, dark && styles.light]}>{contentlet.title}</Text>
      {text(contentlet.text) ? <Text style={[styles.text, dark && styles.lightText]}>{text(contentlet.text)}</Text> : null}
      {cta ? (
        <Pressable style={styles.button} onPress={() => openLink(text(contentlet.ctaLink))}>
          <Text style={styles.buttonText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: Colors.white, padding: Spacing.md, gap: Spacing.sm, marginTop: Spacing.md },
  dark: { backgroundColor: Colors.charcoal },
  image: { width: "100%", aspectRatio: 3 / 2, borderRadius: Radius, marginBottom: Spacing.sm },
  title: { fontSize: 24, color: Colors.charcoal },
  light: { color: Colors.white },
  text: { fontSize: 15, lineHeight: 22, color: Colors.grey },
  lightText: { color: "rgba(255,255,255,0.85)" },
  button: {
    alignSelf: "flex-start",
    backgroundColor: Colors.red,
    borderRadius: Radius,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  buttonText: { color: Colors.white, fontSize: 15 },
});

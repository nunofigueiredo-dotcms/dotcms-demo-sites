import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { text } from "@/lib/content";
import { imageUrl, type ImageField } from "@/lib/dotcms";
import { openLink } from "@/lib/links";
import type { Contentlet } from "@/lib/types";

/** VodafonePageBanner: the header of inner pages. */
export function PageBanner({ contentlet }: { contentlet: Contentlet }) {
  const style = text(contentlet.bannerStyle) ?? "overlay";
  const src = style === "red" ? undefined : imageUrl(contentlet.image as ImageField, 1000);
  const cta = text(contentlet.ctaText);
  return (
    <View style={[styles.banner, style === "red" ? styles.red : styles.dark]}>
      {src ? (
        <Image source={src} style={style === "split" ? styles.splitImage : StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      {src && style === "overlay" ? <View style={styles.scrim} /> : null}
      <View style={styles.body}>
        <Text style={styles.title}>{contentlet.title}</Text>
        {text(contentlet.subtitle) ? <Text style={styles.subtitle}>{text(contentlet.subtitle)}</Text> : null}
        {cta ? (
          <Pressable style={styles.button} onPress={() => openLink(text(contentlet.ctaLink))}>
            <Text style={styles.buttonText}>{cta}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { overflow: "hidden", minHeight: 220, justifyContent: "flex-end" },
  dark: { backgroundColor: "#262626" },
  red: {
    backgroundColor: Colors.red,
    experimental_backgroundImage: `linear-gradient(45deg, ${Colors.redDark}, ${Colors.red})`,
  },
  scrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  splitImage: { width: "100%", aspectRatio: 16 / 10 },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: 30, fontWeight: "600", color: Colors.white },
  subtitle: { fontSize: 15, lineHeight: 21, color: "rgba(255,255,255,0.88)" },
  button: {
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: Colors.red,
    borderRadius: Radius,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  buttonText: { color: Colors.white, fontSize: 15 },
});

import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { imageUrl } from "@/lib/dotcms";
import { openLink } from "@/lib/links";
import type { HeroSlide } from "@/lib/types";

/**
 * Hero slides: one on its own (a VodafoneHeroSlide on the page) is a plain
 * banner; several (a VodafoneHeroCarousel) swipe, with dots.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  if (!slides.length) return null;
  return (
    <View style={styles.carousel}>
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.identifier}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <Image
              source={imageUrl(item.mobileImage) ?? imageUrl(item.image)}
              style={[styles.image, { width }]}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.body}>
              <Text style={styles.title}>
                {item.title} {item.highlight ? <Text style={styles.highlight}>{item.highlight}</Text> : null}
              </Text>
              {item.text ? (
                <Text style={styles.text} numberOfLines={4}>
                  {item.text}
                </Text>
              ) : null}
              {item.ctaText ? (
                <Pressable style={styles.button} onPress={() => openLink(item.ctaLink)}>
                  <Text style={styles.buttonText}>{item.ctaText}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      />
      {slides.length > 1 && (
      <View style={styles.dots}>
        {slides.map((s, i) => (
          <View key={s.identifier} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: { backgroundColor: Colors.white, paddingBottom: Spacing.md },
  image: { aspectRatio: 16 / 10 },
  body: { padding: Spacing.md, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "700", color: Colors.charcoal, textAlign: "center" },
  highlight: { color: Colors.red },
  text: { fontSize: 15, lineHeight: 21, color: Colors.grey, textAlign: "center", marginTop: Spacing.sm },
  button: {
    marginTop: Spacing.md,
    backgroundColor: Colors.red,
    borderRadius: Radius,
    paddingVertical: 12,
    alignSelf: "stretch",
    alignItems: "center",
  },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: "500" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.silver },
  dotActive: { backgroundColor: Colors.red },
});

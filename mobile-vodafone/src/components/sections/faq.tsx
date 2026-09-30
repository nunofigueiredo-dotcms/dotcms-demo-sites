import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { Colors, Spacing } from "@/constants/theme";
import { parseLines, text } from "@/lib/content";
import type { Contentlet } from "@/lib/types";

/** VodafoneFaq: tap a question to show its answer. */
export function Faq({ contentlet }: { contentlet: Contentlet }) {
  const [open, setOpen] = useState<string>();
  const questions = parseLines(contentlet.items, 2);
  return (
    <View style={styles.section}>
      {text(contentlet.heading) ? <Text style={styles.heading}>{text(contentlet.heading)}</Text> : null}
      {text(contentlet.intro) ? <Text style={styles.intro}>{text(contentlet.intro)}</Text> : null}
      {questions.map(([question, answer]) => (
        <Pressable key={question} style={styles.item} onPress={() => setOpen(open === question ? undefined : question)}>
          <View style={styles.question}>
            <Text style={styles.questionText}>{question}</Text>
            <Icon name={open === question ? "minus" : "plus"} color={Colors.red} size={16} />
          </View>
          {open === question ? <Text style={styles.answer}>{answer}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: Colors.white, padding: Spacing.md, marginTop: Spacing.md },
  heading: { fontSize: 24, color: Colors.charcoal },
  intro: { fontSize: 15, color: Colors.grey, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  item: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.silver, paddingVertical: Spacing.md },
  question: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  questionText: { flex: 1, fontSize: 16, color: Colors.charcoal },
  answer: { fontSize: 14, lineHeight: 20, color: Colors.grey, marginTop: Spacing.sm },
});

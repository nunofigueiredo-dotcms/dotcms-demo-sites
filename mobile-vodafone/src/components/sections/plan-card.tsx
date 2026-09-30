import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { formatPrice } from "@/lib/content";
import { openLink } from "@/lib/links";
import type { Plan } from "@/lib/types";

const PREVIEW = 3;

/** One VodafonePlan: allowance, price, benefits and a buy button. */
export function PlanCard({ plan }: { plan: Plan }) {
  const [expanded, setExpanded] = useState(false);
  const benefits = (plan.benefits ?? "").split(/\r?\n/).filter(Boolean);
  const shown = expanded ? benefits : benefits.slice(0, PREVIEW);
  return (
    <View style={styles.card}>
      {plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
      <Text style={styles.name}>{plan.title}</Text>
      <View style={styles.allowance}>
        {plan.data ? (
          <View style={styles.allowanceItem}>
            <Text style={styles.allowanceValue}>{plan.data}</Text>
            <Text style={styles.allowanceLabel}>Data</Text>
          </View>
        ) : null}
        {plan.minutes ? (
          <View style={styles.allowanceItem}>
            <Text style={styles.allowanceValue}>{plan.minutes}</Text>
            <Text style={styles.allowanceLabel}>Minutes to any network</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.price}>
        <Text style={styles.small}>EGP </Text>
        {formatPrice(plan.price)}
        <Text style={styles.small}>/month</Text>
      </Text>
      {plan.priceNote ? <Text style={styles.note}>{plan.priceNote}</Text> : null}
      {plan.subscriptions?.length ? (
        <View style={styles.subscriptions}>
          <Text style={styles.subscriptionsTitle}>
            {plan.subscriptionsIncluded
              ? `Choose ${plan.subscriptionsIncluded} of ${plan.subscriptions.length} subscriptions`
              : "Subscriptions"}
          </Text>
          <View style={styles.chips}>
            {plan.subscriptions.map((s) => (
              <Text key={s.title} style={styles.chip}>
                {s.title}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      {shown.map((b) => (
        <Text key={b} style={styles.benefit}>
          <Text style={styles.check}>✓ </Text>
          {b}
        </Text>
      ))}
      {benefits.length > PREVIEW ? (
        <Pressable onPress={() => setExpanded(!expanded)}>
          <Text style={styles.more}>{expanded ? "Show fewer benefits" : `Show all ${benefits.length} benefits`}</Text>
        </Pressable>
      ) : null}
      {plan.ctaText ? (
        <Pressable style={styles.button} onPress={() => openLink(plan.ctaLink)}>
          <Text style={styles.buttonText}>{plan.ctaText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius,
    borderTopWidth: 4,
    borderTopColor: Colors.red,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  badge: {
    position: "absolute",
    top: -12,
    right: Spacing.md,
    backgroundColor: Colors.charcoal,
    color: Colors.white,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  name: { fontSize: 22, color: Colors.red, fontWeight: "600" },
  allowance: {
    flexDirection: "row",
    gap: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.silver,
  },
  allowanceItem: { gap: 2 },
  allowanceValue: { fontSize: 22, color: Colors.charcoal },
  allowanceLabel: { fontSize: 12, color: Colors.grey },
  price: { fontSize: 28, color: Colors.charcoal },
  small: { fontSize: 15, color: Colors.grey },
  note: { fontSize: 12, color: Colors.grey, marginTop: -Spacing.xs },
  subscriptions: { gap: 6, marginVertical: Spacing.xs },
  subscriptionsTitle: { fontSize: 15, color: Colors.charcoal },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    fontSize: 12,
    color: Colors.red,
    borderWidth: 1,
    borderColor: "rgba(230,0,0,0.3)",
    backgroundColor: "rgba(230,0,0,0.05)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
  },
  benefit: { fontSize: 14, lineHeight: 20, color: Colors.grey },
  check: { color: Colors.red },
  more: { fontSize: 14, color: Colors.red },
  button: { backgroundColor: Colors.red, borderRadius: Radius, paddingVertical: 12, alignItems: "center", marginTop: Spacing.sm },
  buttonText: { color: Colors.white, fontSize: 16 },
});

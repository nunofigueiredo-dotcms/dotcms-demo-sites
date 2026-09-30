import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { useDotCMS } from "@/hooks/use-dotcms";
import { text } from "@/lib/content";
import { fetchPlans } from "@/lib/queries";
import type { Contentlet } from "@/lib/types";
import { PlanCard } from "./plan-card";

/** VodafonePlanList: every published plan in one family. */
export function PlanList({ contentlet }: { contentlet: Contentlet }) {
  const family = String(contentlet.family ?? "red");
  const load = useCallback(() => fetchPlans(family), [family]);
  const { data: plans = [] } = useDotCMS(load);
  return (
    <View style={styles.section}>
      {text(contentlet.heading) ? <Text style={styles.heading}>{text(contentlet.heading)}</Text> : null}
      {plans.map((plan) => (
        <PlanCard key={plan.identifier} plan={plan} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: Spacing.md },
  heading: { fontSize: 22, color: Colors.charcoal, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
});

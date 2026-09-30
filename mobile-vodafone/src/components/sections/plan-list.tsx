import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { useDotCMS } from "@/hooks/use-dotcms";
import { text } from "@/lib/content";
import { fetchPlans } from "@/lib/queries";
import type { Contentlet } from "@/lib/types";
import { PlanCard } from "./plan-card";

/** VodafonePlanList: its Plans relationship arrives as identifiers, in the editor's order. */
export function PlanList({ contentlet }: { contentlet: Contentlet }) {
  const ids = (Array.isArray(contentlet.plans) ? contentlet.plans : []).map((p) =>
    typeof p === "string" ? p : String((p as { identifier?: string }).identifier)
  );
  const key = ids.join(",");
  const load = useCallback(() => fetchPlans(key ? key.split(",") : []), [key]);
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

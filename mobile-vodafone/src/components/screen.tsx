import type { ReactNode } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";

interface ScreenProps {
  loading: boolean;
  error?: string;
  refreshing: boolean;
  onRefresh: () => void;
  children?: ReactNode;
}

/** A scrolling screen with a loading state, errors and pull-to-refresh. */
export function Screen({ loading, error, refreshing, onRefresh, children }: ScreenProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />}
    >
      {loading ? (
        <ActivityIndicator style={styles.center} color={Colors.red} size="large" />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn&apos;t load content from dotCMS</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        children
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.mist },
  center: { marginTop: 120, paddingHorizontal: Spacing.lg, alignItems: "center" },
  errorTitle: { fontSize: 17, fontWeight: "600", color: Colors.charcoal, marginBottom: Spacing.sm, textAlign: "center" },
  errorText: { fontSize: 14, color: Colors.grey, textAlign: "center" },
});

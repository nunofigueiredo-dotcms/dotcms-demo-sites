import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Colors } from "@/constants/theme";

/** The iOS tab bar: one tab per section of the Vodafone site. */
export default function AppTabs() {
  return (
    <NativeTabs tintColor={Colors.red}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plans">
        <NativeTabs.Trigger.Label>Plans</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="simcard.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cash">
        <NativeTabs.Trigger.Label>Cash</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="wallet.bifold.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stores">
        <NativeTabs.Trigger.Label>Stores</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="mappin.and.ellipse" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

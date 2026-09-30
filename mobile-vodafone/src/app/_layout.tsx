import { DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AppTabs from "@/components/app-tabs";
import { Colors } from "@/constants/theme";

// The Vodafone brand is a light design; the app doesn't switch to dark mode.
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: Colors.red, background: Colors.mist } };

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="dark" />
      <AppTabs />
    </ThemeProvider>
  );
}

import { router, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

// Pages on the website that have a tab in the app.
const TABS: Record<string, Href> = {
  "/": "/",
  "/plans": "/plans",
  "/vodafone-cash": "/cash",
  "/store-locator": "/stores",
};

/**
 * Follow a link an editor entered in dotCMS: a site page with a tab switches
 * to that tab, a phone number dials, and anything else opens in an in-app
 * browser (site pages on vodafone.com.eg's own website).
 */
export function openLink(href: string | undefined | null) {
  if (!href || href.startsWith("#")) return;
  if (href.startsWith("tel:")) {
    Linking.openURL(href);
    return;
  }
  const path = href.replace(/\/$/, "") || "/";
  const tab = TABS[path];
  if (tab) {
    router.navigate(tab);
    return;
  }
  const url = href.startsWith("/") ? `https://web.vodafone.com.eg/en${href}` : href;
  WebBrowser.openBrowserAsync(url);
}

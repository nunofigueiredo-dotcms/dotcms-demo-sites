import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/theme";

/** The Vodafone speech mark, as drawn on web.vodafone.com.eg. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Vodafone">
      <Path
        d="M47.95 23.952a23.993 23.993 0 0 1-24 24 23.907 23.907 0 0 1-23.9-24 23.886 23.886 0 0 1 23.9-23.9 23.972 23.972 0 0 1 24 23.9"
        fill={Colors.red}
        fillRule="evenodd"
      />
      <Path
        d="M37.877 25.142a13.023 13.023 0 0 1-13.222 12.822c-8.051 0-13.536-7.04-13.395-14.929 0-11.532 9.626-20.867 21.519-20.867q.743 0 1.472.049c-4.245 2.056-7.143 5.907-7.288 10.353a12.92 12.92 0 0 1 10.914 12.572"
        fill={Colors.white}
        fillRule="evenodd"
      />
    </Svg>
  );
}

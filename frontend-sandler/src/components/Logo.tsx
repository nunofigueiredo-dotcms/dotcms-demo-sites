import Image from "next/image";

/**
 * The Sandler wordmark (white, with the stylised cyan "E"). It is designed
 * for the navy header and footer, so always place it on a dark background.
 */
export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/brand/sandler-logo.png"
      alt="Sandler"
      width={574}
      height={72}
      // A static brand asset, not a dotCMS image — skip the dotCMS loader.
      unoptimized
      priority
      className={className}
    />
  );
}

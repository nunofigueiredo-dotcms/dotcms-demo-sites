import Image from "next/image";

/** The TSD seal: a star inside "Texas School for the Deaf · Est. 1856 · Learn. Grow. Belong." */
export function Seal({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/tsd-seal.png"
      alt=""
      width={size}
      height={size}
      className={className}
      // A local file, not dotCMS content: skip the dotCMS image loader.
      unoptimized
      priority
    />
  );
}

/** The seal and the school's name, as in the site header. */
export function Logo() {
  return (
    <span className="logo">
      <Seal size={64} className="logo__seal" />
      <span className="logo__name">Texas School for the Deaf</span>
    </span>
  );
}

/** The three staggered bars from the Sandler "E", used on buttons. */
export function BarsIcon({ className = "h-3 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 12" aria-hidden className={className} fill="currentColor">
      <rect x="4" y="0" width="12" height="2" />
      <rect x="2" y="5" width="12" height="2" />
      <rect x="0" y="10" width="12" height="2" />
    </svg>
  );
}

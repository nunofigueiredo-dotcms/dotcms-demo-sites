/**
 * A small corner badge on the live site showing which persona the page is
 * personalized for, with a link back to the default page — so a presenter
 * can see (and reset) what the visitor is getting.
 */
export function PersonaBadge({ name }: { name: string }) {
  return (
    <div className="persona-badge" role="status">
      <span>
        Personalized for <strong>{name}</strong>
      </span>
      <a href="?persona=reset">Reset</a>
    </div>
  );
}

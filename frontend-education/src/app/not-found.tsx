import Link from "next/link";
import { Seal } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="not-found">
      <Seal size={112} />
      <h1>Page not found</h1>
      <p>The page you are looking for may have moved or no longer exists.</p>
      <Link href="/" className="btn btn--primary">
        Go to the home page
      </Link>
    </main>
  );
}

import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="not-found">
      <Logo className="h-16 w-16" />
      <h1>Page not found</h1>
      <p>The page you are looking for may have moved or no longer exists.</p>
      <Link href="/" className="btn btn--primary">
        Go to home page
      </Link>
    </main>
  );
}

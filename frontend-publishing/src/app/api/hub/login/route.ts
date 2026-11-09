import { NextResponse, type NextRequest } from "next/server";
import { login } from "@/lib/dotcms";
import { READER_COOKIE, SESSION_COOKIE } from "@/lib/session";

/** Sign in to the Messaging Hub with a dotCMS account. The user's own dotCMS
 * session is kept in an httpOnly cookie; the password isn't stored. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const session = email && password ? await login(email, password) : null;
  if (!session) return NextResponse.redirect(new URL("/hub?signin=failed#sign-in", request.url), 303);

  const res = NextResponse.redirect(new URL("/hub#my-items", request.url), 303);
  const options = { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: 8 * 60 * 60 };
  res.cookies.set(SESSION_COOKIE, session.cookie, options);
  // Field teams (Hub Reader) have no backend access, so dotCMS won't describe
  // them to their own session; keep the name from the sign-in for display.
  if (session.backendUser) res.cookies.delete(READER_COOKIE);
  else res.cookies.set(READER_COOKIE, session.name, options);
  return res;
}

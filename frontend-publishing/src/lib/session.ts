import { cookies } from "next/headers";

// The hub keeps the signed-in user's own dotCMS session cookies in one
// httpOnly cookie. The browser can't read it, and it only ever goes back to
// this server, which forwards it to dotCMS for "My items in review".
export const SESSION_COOKIE = "pd_hub_session";
/** Display name of a signed-in hub user without dotCMS backend access (Hub Reader).
 * Shown as text only: anything that needs permissions goes through the session. */
export const READER_COOKIE = "pd_hub_reader";

export async function hubSession(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function readerName(): Promise<string | undefined> {
  return (await cookies()).get(READER_COOKIE)?.value;
}

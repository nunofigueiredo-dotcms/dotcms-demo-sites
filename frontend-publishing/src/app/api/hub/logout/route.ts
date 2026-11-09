import { NextResponse, type NextRequest } from "next/server";
import { READER_COOKIE, SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/hub", request.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(READER_COOKIE);
  return res;
}

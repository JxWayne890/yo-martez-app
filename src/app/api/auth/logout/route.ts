import { NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  expiredAuthCookieOptions,
} from "@/lib/auth-cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(AUTH_ACCESS_COOKIE, "", expiredAuthCookieOptions());
  response.cookies.set(AUTH_REFRESH_COOKIE, "", expiredAuthCookieOptions());

  return response;
}

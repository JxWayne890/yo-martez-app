export const AUTH_ACCESS_COOKIE = "ym_dashboard_access_token";
export const AUTH_REFRESH_COOKIE = "ym_dashboard_refresh_token";

export const AUTH_ACCESS_MAX_AGE_SECONDS = 60 * 60;
export const AUTH_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function expiredAuthCookieOptions() {
  return authCookieOptions(0);
}

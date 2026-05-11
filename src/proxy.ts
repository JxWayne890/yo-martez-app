import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_ACCESS_MAX_AGE_SECONDS,
  AUTH_REFRESH_COOKIE,
  AUTH_REFRESH_MAX_AGE_SECONDS,
  authCookieOptions,
  expiredAuthCookieOptions,
} from "@/lib/auth-cookies";

interface SupabaseAuthConfig {
  url: string;
  key: string;
}

interface SupabaseRefreshResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

const AUTH_CONFIG_ERROR =
  "Supabase authentication is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";

function isDashboardAuthEnabled() {
  return process.env.DASHBOARD_AUTH_ENABLED === "true";
}

function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return { url, key };
}

function isDashboardApiRequest(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/dashboard");
}

function authSetupErrorResponse(request: NextRequest) {
  if (isDashboardApiRequest(request)) {
    return NextResponse.json({ error: AUTH_CONFIG_ERROR }, { status: 503 });
  }

  const loginUrl = getLoginUrl(request);
  loginUrl.searchParams.set("setup", "supabase");

  return NextResponse.redirect(loginUrl);
}

function getLoginUrl(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  return loginUrl;
}

function unauthenticatedResponse(request: NextRequest) {
  if (isDashboardApiRequest(request)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const loginUrl = getLoginUrl(request);

  return NextResponse.redirect(loginUrl);
}

async function verifyAccessToken(
  accessToken: string,
  config: SupabaseAuthConfig
): Promise<boolean> {
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.key,
      authorization: `Bearer ${accessToken}`,
    },
  });

  return response.ok;
}

async function refreshAccessToken(
  refreshToken: string,
  config: SupabaseAuthConfig
): Promise<SupabaseRefreshResponse | null> {
  const response = await fetch(
    `${config.url}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        "content-type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  if (!response.ok) return null;

  return response.json() as Promise<SupabaseRefreshResponse>;
}

function setAuthCookies(response: NextResponse, session: SupabaseRefreshResponse) {
  if (session.access_token) {
    response.cookies.set(
      AUTH_ACCESS_COOKIE,
      session.access_token,
      authCookieOptions(session.expires_in || AUTH_ACCESS_MAX_AGE_SECONDS)
    );
  }

  if (session.refresh_token) {
    response.cookies.set(
      AUTH_REFRESH_COOKIE,
      session.refresh_token,
      authCookieOptions(AUTH_REFRESH_MAX_AGE_SECONDS)
    );
  }
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_ACCESS_COOKIE, "", expiredAuthCookieOptions());
  response.cookies.set(AUTH_REFRESH_COOKIE, "", expiredAuthCookieOptions());
}

export async function proxy(request: NextRequest) {
  if (!isDashboardAuthEnabled()) {
    return NextResponse.next();
  }

  const config = getSupabaseAuthConfig();

  if (!config) {
    return authSetupErrorResponse(request);
  }

  const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE)?.value;

  if (accessToken && (await verifyAccessToken(accessToken, config))) {
    return NextResponse.next();
  }

  if (refreshToken) {
    const refreshedSession = await refreshAccessToken(refreshToken, config);

    if (refreshedSession?.access_token) {
      const response = NextResponse.next();
      setAuthCookies(response, refreshedSession);
      return response;
    }
  }

  const response = unauthenticatedResponse(request);
  clearAuthCookies(response);
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/dashboard/:path*"],
};

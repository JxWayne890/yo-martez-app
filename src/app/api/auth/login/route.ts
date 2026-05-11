import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_ACCESS_MAX_AGE_SECONDS,
  AUTH_REFRESH_COOKIE,
  AUTH_REFRESH_MAX_AGE_SECONDS,
  authCookieOptions,
} from "@/lib/auth-cookies";

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        error:
          "Supabase authentication is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 }
    );
  }

  let email: string;
  let password: string;

  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email.trim() : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  });

  response.cookies.set(
    AUTH_ACCESS_COOKIE,
    data.session.access_token,
    authCookieOptions(data.session.expires_in || AUTH_ACCESS_MAX_AGE_SECONDS)
  );
  response.cookies.set(
    AUTH_REFRESH_COOKIE,
    data.session.refresh_token,
    authCookieOptions(AUTH_REFRESH_MAX_AGE_SECONDS)
  );

  return response;
}

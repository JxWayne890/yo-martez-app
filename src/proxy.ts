import { NextResponse, type NextRequest } from "next/server";

function unauthorizedResponse(message = "Authentication required") {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Yo! Martez Admin"',
    },
  });
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

function hasValidBasicAuth(request: NextRequest): boolean {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  let decoded = "";
  try {
    decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const providedUsername = decoded.slice(0, separatorIndex);
  const providedPassword = decoded.slice(separatorIndex + 1);

  return (
    timingSafeEqual(providedUsername, username) &&
    timingSafeEqual(providedPassword, password)
  );
}

export function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if ((!username || !password) && process.env.NODE_ENV === "production") {
    return new NextResponse(
      "Admin authentication is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.",
      { status: 503 }
    );
  }

  if (!hasValidBasicAuth(request)) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/dashboard/:path*"],
};

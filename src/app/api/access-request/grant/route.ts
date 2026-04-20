import { grantAccessRequest } from "@/lib/workflows/access-requests";

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  const token = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;
  return Boolean(token && authHeader === `Bearer ${token}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const email = String(body.email || "").trim();

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  await grantAccessRequest(email, body.password);
  return Response.json({ success: true });
}

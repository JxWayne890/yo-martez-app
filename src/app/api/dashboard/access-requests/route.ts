import { supabase } from "@/lib/supabase";
import { grantAccessRequest } from "@/lib/workflows/access-requests";

export async function GET() {
  const { data, error } = await supabase
    .from("AccessRequest")
    .select(
      "id, firstName, lastName, email, phone, comment, source, proofSubmittedAt, accessGrantedAt, passwordSentAt, reminderSentAt, createdAt, updatedAt"
    )
    .order("createdAt", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Access requests GET error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  return Response.json({ requests: data || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim();

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  await grantAccessRequest(email, body.password);
  return Response.json({ success: true });
}

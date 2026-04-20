import { markAccessProofSubmitted } from "@/lib/workflows/access-requests";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim();

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const accessRequest = await markAccessProofSubmitted(email);
  return Response.json({ accessRequest });
}

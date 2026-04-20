import { createAccessRequest } from "@/lib/workflows/access-requests";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim();

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const accessRequest = await createAccessRequest({
    firstName: body.firstName || body.first_name || null,
    lastName: body.lastName || body.last_name || null,
    email,
    phone: body.phone || null,
    comment: body.comment || null,
    source: body.source || "web",
  });

  return Response.json({ accessRequest }, { status: 201 });
}

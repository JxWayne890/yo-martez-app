import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const eventType = searchParams.get("eventType");

  let query = supabase
    .from("CustomerEventLog")
    .select(
      "id, shopifyCustomerId, customerEmail, customerName, eventType, emailSent, createdAt",
      { count: "exact" }
    );

  if (eventType) {
    query = query.eq("eventType", eventType);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Customers error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  const total = count || 0;

  return Response.json({
    events: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const filter = searchParams.get("filter") || "all";

  let query = supabase
    .from("AbandonedCartTracking")
    .select(
      "id, customerEmail, customerFirstName, totalPrice, lineItems, checkoutCreatedAt, timesContacted, lastContactedAt, currentStage, isRecovered, isCompleted, abandonedCheckoutUrl",
      { count: "exact" }
    );

  if (filter === "pending") {
    query = query.eq("isCompleted", false);
  } else if (filter === "recovered") {
    query = query.eq("isRecovered", true);
  } else if (filter === "completed") {
    query = query.eq("isCompleted", true).eq("isRecovered", false);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Abandoned carts error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  const total = count || 0;

  return Response.json({
    carts: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

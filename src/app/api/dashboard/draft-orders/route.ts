import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("DraftOrderLog")
    .select(
      "id, shopifyDraftOrderId, customerName, customerEmail, parsedProducts, matchedVariants, status, errorMessage, createdAt",
      { count: "exact" }
    )
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Draft orders error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  const total = count || 0;

  return Response.json({
    orders: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

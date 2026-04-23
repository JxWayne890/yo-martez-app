import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data: cart, error: cartError } = await supabase
      .from("AbandonedCartTracking")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (cartError) throw cartError;
    if (!cart) {
      return Response.json({ error: "Cart not found" }, { status: 404 });
    }

    const [profileResult, eventsResult, allCartsResult] = await Promise.all([
      supabase
        .from("CustomerProfile")
        .select("*")
        .eq("email", cart.customerEmail)
        .maybeSingle(),
      supabase
        .from("CustomerEventLog")
        .select("id, eventType, emailSent, metadata, createdAt")
        .eq("customerEmail", cart.customerEmail)
        .in("eventType", ["abandoned_cart", "customer_imported"])
        .order("createdAt", { ascending: false }),
      supabase
        .from("AbandonedCartTracking")
        .select("id, shopifyCheckoutId, totalPrice, checkoutCreatedAt, isRecovered, isCompleted")
        .eq("customerEmail", cart.customerEmail)
        .neq("id", id)
        .order("checkoutCreatedAt", { ascending: false }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (eventsResult.error) throw eventsResult.error;
    if (allCartsResult.error) throw allCartsResult.error;

    const stageEmails = (eventsResult.data || []).filter(
      (e) =>
        e.eventType === "abandoned_cart" &&
        e.emailSent &&
        (e.metadata as { checkoutId?: string } | null)?.checkoutId ===
          cart.shopifyCheckoutId
    );

    return Response.json({
      cart,
      profile: profileResult.data,
      stageEmails,
      otherCartsForCustomer: allCartsResult.data || [],
    });
  } catch (error) {
    const detail =
      error && typeof error === "object"
        ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        : String(error);
    logger.error("Abandoned cart detail fetch failed", { id, error: detail });
    return Response.json(
      { error: "Failed to load cart", detail },
      { status: 500 }
    );
  }
}

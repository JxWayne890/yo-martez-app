import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

interface AbandonedCartRow {
  id: string;
  shopifyCheckoutId: string;
  customerEmail: string;
  customerFirstName: string | null;
  totalPrice: string | null;
  currentStage: number;
  lastContactedAt: string | null;
}

interface EventRow {
  id: string;
  emailSent: string | null;
  metadata: { checkoutId?: string; stage?: number } | null;
}

const STAGE_SLUGS: Record<number, string> = {
  1: "abandoned-cart-1",
  2: "abandoned-cart-2",
  3: "abandoned-cart-3",
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: carts, error: cartsError } = await supabase
      .from("AbandonedCartTracking")
      .select(
        "id, shopifyCheckoutId, customerEmail, customerFirstName, totalPrice, currentStage, lastContactedAt"
      )
      .gte("currentStage", 1);

    if (cartsError) throw cartsError;

    const cartList = (carts || []) as AbandonedCartRow[];
    let eventsCreated = 0;
    let cartsInspected = 0;
    const profileIdCache = new Map<string, string | null>();

    for (const cart of cartList) {
      cartsInspected++;

      const { data: existingEvents, error: existingError } = await supabase
        .from("CustomerEventLog")
        .select("id, emailSent, metadata")
        .eq("customerEmail", cart.customerEmail)
        .eq("eventType", "abandoned_cart");

      if (existingError) throw existingError;

      const matchesCart = (existingEvents || []).filter(
        (e: EventRow) =>
          e.metadata && e.metadata.checkoutId === cart.shopifyCheckoutId
      );

      if (matchesCart.length >= cart.currentStage) continue;

      let shopifyCustomerId: string | null;
      if (profileIdCache.has(cart.customerEmail)) {
        shopifyCustomerId = profileIdCache.get(cart.customerEmail)!;
      } else {
        const { data: profile } = await supabase
          .from("CustomerProfile")
          .select("shopifyCustomerId")
          .eq("email", cart.customerEmail)
          .maybeSingle();
        shopifyCustomerId = profile?.shopifyCustomerId || null;
        profileIdCache.set(cart.customerEmail, shopifyCustomerId);
      }

      const sentStages = new Set(
        matchesCart
          .map((e: EventRow) => e.metadata?.stage)
          .filter((s): s is number => typeof s === "number")
      );

      for (let stage = 1; stage <= cart.currentStage; stage++) {
        if (sentStages.has(stage)) continue;
        const slug = STAGE_SLUGS[stage];
        if (!slug) continue;

        const { error: insertError } = await supabase
          .from("CustomerEventLog")
          .insert({
            shopifyCustomerId: shopifyCustomerId || "unknown",
            customerEmail: cart.customerEmail,
            customerName: cart.customerFirstName || null,
            eventType: "abandoned_cart",
            emailSent: slug,
            metadata: {
              checkoutId: cart.shopifyCheckoutId,
              stage,
              totalPrice: cart.totalPrice,
              backfilled: true,
            },
            createdAt: cart.lastContactedAt || new Date().toISOString(),
          });

        if (insertError) {
          logger.warn("Backfill insert failed", {
            cartId: cart.id,
            stage,
            error: insertError.message,
          });
          continue;
        }
        eventsCreated++;
      }
    }

    logger.info("Cart event backfill complete", {
      cartsInspected,
      eventsCreated,
    });

    return Response.json({
      success: true,
      cartsInspected,
      eventsCreated,
    });
  } catch (error) {
    const detail =
      error && typeof error === "object"
        ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        : String(error);
    logger.error("Cart event backfill failed", { error: detail });
    return Response.json(
      { error: "Backfill failed", detail },
      { status: 500 }
    );
  }
}

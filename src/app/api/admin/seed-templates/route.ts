import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const NAME = "{{customer_first_name}}";
const STORE_URL = "{{store_url}}";
const STORE_LOGO = "{{store_logo}}";
const CHECKOUT_URL = "{{checkout_url}}";
const DISCOUNT_CODE = "{{discount_code}}";
const DISCOUNT_AMOUNT = "{{discount_amount}}";

const welcomeHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Welcome to Yo! Fam</h2>
  <p>Hey ${NAME},</p>
  <p>We're beyond hyped to have you join the Yo! Martez community. You're not just a shopper — you're now part of the fam.</p>
  <p>Here's what to expect: exclusive drops, behind-the-scenes vibes, and first access to the heat we've got coming up.</p>
  <p>Stay locked in — this is only the beginning.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="${STORE_URL}" style="background-color: #8A2BE2; color: white; padding: 14px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">Visit our store</a>
  </div>
  <p>If you ever have questions or just want to say hey, hit us up.</p>
  <p>Welcome to something different. Welcome to Yo! Martez.</p>
  <p>– The Yo! Team</p>
</div>`;

const farewellHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">All Love, No Pressure</h2>
  <p>Hey ${NAME},</p>
  <p>We saw you unsubscribed from Yo! Emails.</p>
  <p>No hard feelings at all.</p>
  <p>We're grateful for the time you spent with Yo! Martez.</p>
  <p>Yo! Inbox won't be hearing from us anymore — but if you ever want to come back, the door's wide open.</p>
  <p>Keep doing Yo! Thing, and if you ever feel like tuning back in, we'll be right here.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="${STORE_URL}" style="background-color: #8A2BE2; color: white; padding: 14px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">Visit Yo! Store</a>
  </div>
  <p>Stay fresh.</p>
  <p>All respect and gratitude.</p>
  <p>Peace,</p>
  <p>– The Yo! Martez Team</p>
</div>`;

const abandonedCart1Html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Yo! Cart's still waiting 👀</h2>
  <p>Hey ${NAME},</p>
  <p>We saved Yo! Picks — but they won't stick around forever.</p>
  <p>Our pieces go fast. Once it's gone, it's gone. Don't let Yo! Favorites get scooped by someone else.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="${CHECKOUT_URL}" style="background-color: #8A2BE2; color: white; padding: 14px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">Return to Yo! Cart</a>
  </div>
  <p>Secure Yo! Items now and ride the Yo! wave.</p>
  <p>— Yo! Martez</p>
</div>`;

const abandonedCart2Html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Still thinking it over?</h2>
  <p>Hey ${NAME},</p>
  <p>Yo! Cart's still hanging out with us — but probably not for long.</p>
  <p>Styles this good don't sit for too long. Finish what you started and make it Yo! Style before it disappears.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="${CHECKOUT_URL}" style="background-color: #8A2BE2; color: white; padding: 14px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">Return to Yo! Cart</a>
  </div>
  <p>It only takes a minute — and you'll be glad you did.</p>
  <p>— Yo! Martez</p>
</div>`;

const abandonedCart3Html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Last call, ${NAME} — ${DISCOUNT_AMOUNT} off Yo! Cart</h2>
  <p>Hey ${NAME},</p>
  <p>This is the last time we'll bump Yo! Cart — and we're sending you out with a win.</p>
  <p>Use code <strong>${DISCOUNT_CODE}</strong> at checkout for <strong>${DISCOUNT_AMOUNT} OFF</strong>. Yo! Picks are still saved, but not for long.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="${CHECKOUT_URL}" style="background-color: #8A2BE2; color: white; padding: 14px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">Claim ${DISCOUNT_AMOUNT} OFF &amp; Check Out</a>
  </div>
  <p>After this, Yo! Cart clears. Don't leave it on the table.</p>
  <p>— Yo! Martez</p>
</div>`;

const stage45Html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">We're just getting started, ${NAME}.</h2>
  <p style="font-size: 16px; line-height: 1.5;">It's been a minute since you checked in with Yo! — and we just want to say thanks again for rolling with us.</p>
  <p style="font-size: 16px; line-height: 1.5;">Yo! support means the world. Every order fuels something bigger — a culture, a cause, and a community built on real impact.</p>
  <p style="font-size: 16px; line-height: 1.5;">🔥 New drops? On the way.<br>🎁 Surprise giveaways? Always cooking.<br>💡 Perks &amp; exclusives? You already know.</p>
  <p style="font-size: 16px; line-height: 1.5;">If you're not already tapped in with us on socials, now's the time:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://www.instagram.com/yomartez/?hl=en" style="margin: 0 10px;">
      <img src="https://www.pagetraffic.com/blog/wp-content/uploads/2022/06/new-instagram-transparent-full-color-logo.png" alt="Instagram" style="width: 40px;">
    </a>
    <a href="https://www.facebook.com/yomartez" style="margin: 0 10px;">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Facebook_Logo_2023.png/1200px-Facebook_Logo_2023.png?20231011121526" alt="Facebook" style="width: 40px;">
    </a>
  </div>
  <div style="text-align: center; margin: 40px 0;">
    <a href="${STORE_URL}" style="background-color: #7D3AED; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block;">
      Visit Yo! Store
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.5;">We've got so much more in store — and you're already part of it.</p>
  <p style="font-size: 16px; line-height: 1.5;">Until next time... stay bold, stay rooted, and rep Yo! Brand with pride.</p>
  <p style="margin-top: 40px; font-size: 16px;">Much love,</p>
  <p style="font-size: 16px;">— Yo! Martez</p>
</div>`;

const stage60Html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Yo! ${NAME}, we dropped these while you were gone.</h2>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    It's been a minute since Yo! last checked in — and we've been busy.
    Here are a few of the latest drops you might've missed:
  </p>
  <h3 style="text-align: center; font-size: 20px; margin-top: 40px;">🔥 Products You Missed</h3>
  <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
    <!-- product rows injected at send time -->
  </table>
  <div style="text-align: center; margin: 40px 0;">
    <a href="${STORE_URL}" style="background-color: #7D3AED; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block;">
      See Everything New
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    We'd love to see you back. Stay bold. Stay rooted. Rep Yo! Brand with pride.
  </p>
  <p style="margin-top: 40px; font-size: 16px; text-align: center;">Much love,</p>
  <p style="font-size: 16px; text-align: center;">— Yo! Martez</p>
</div>`;

const stage75Html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Yo! ${NAME}, we miss having you around.</h2>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    It's been 75 days since Yo! last visit?! Well, we're ready to welcome you back with something solid.
  </p>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    Use code <strong>COMEBACK15</strong> at checkout to unlock <strong>15% OFF</strong> anything in the store.
    But act fast — this one's a limited drop.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${STORE_URL}" style="background-color: #7D3AED; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block;">
      Use COMEBACK15 Now
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    Yo! Brand is growing — new drops, new statements, and the same real ones at the core.
    Let's keep building something bold together.
  </p>
  <p style="margin-top: 40px; font-size: 16px; text-align: center;">Much love,</p>
  <p style="font-size: 16px; text-align: center;">— Yo! Martez</p>
</div>`;

const stage90Html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="${STORE_LOGO}" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Yo! ${NAME}, that exclusive code won't be around much longer.</h2>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    Just a heads up — your <strong>15% OFF</strong> code <strong>COMEBACK15</strong> is close to expiring.
  </p>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    If you've been thinking about making your next move, now's the time to slide back in.
    We'd hate for you to miss it.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${STORE_URL}" style="background-color: #7D3AED; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block;">
      Use COMEBACK15 Before It's Gone
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    New drops. Real stories. Strong community.
    Let's keep Yo! journey going — together.
  </p>
  <p style="margin-top: 40px; font-size: 16px; text-align: center;">Much love,</p>
  <p style="font-size: 16px; text-align: center;">— Yo! Martez</p>
</div>`;

const templates = [
  { slug: "welcome", subject: "Welcome to Yo! Fam", htmlBody: welcomeHtml },
  { slug: "farewell", subject: "All Love, No Pressure", htmlBody: farewellHtml },
  { slug: "abandoned-cart-1", subject: "Yo! Cart's still waiting 👀", htmlBody: abandonedCart1Html },
  { slug: "abandoned-cart-2", subject: "Still thinking it over? Yo! Picks are almost gone", htmlBody: abandonedCart2Html },
  { slug: "abandoned-cart-3", subject: "Last Call: {{discount_amount}} OFF Yo! Cart", htmlBody: abandonedCart3Html },
  { slug: "reengagement-45", subject: "The Movement Hasn't Stopped. Neither Have Yo! Perks", htmlBody: stage45Html },
  { slug: "reengagement-60", subject: "Yo! We Dropped These While You Were Gone", htmlBody: stage60Html },
  { slug: "reengagement-75", subject: "Yo! Comeback Code Inside: 15% OFF Just for You 👊", htmlBody: stage75Html },
  { slug: "reengagement-90", subject: "Last Call: Yo! 15% OFF Code's Almost Gone", htmlBody: stage90Html },
];

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { slug: string; action: "created" | "updated" }[] = [];

  try {
    for (const template of templates) {
      const { data: existing, error: findError } = await supabase
        .from("EmailTemplate")
        .select("id")
        .eq("slug", template.slug)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        const { error } = await supabase
          .from("EmailTemplate")
          .update({
            subject: template.subject,
            htmlBody: template.htmlBody,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
        results.push({ slug: template.slug, action: "updated" });
      } else {
        const { error } = await supabase.from("EmailTemplate").insert({
          slug: template.slug,
          subject: template.subject,
          htmlBody: template.htmlBody,
          isActive: true,
        });
        if (error) throw error;
        results.push({ slug: template.slug, action: "created" });
      }
    }

    logger.info("Templates seeded", { count: results.length });
    return Response.json({ success: true, seeded: results.length, results });
  } catch (error) {
    logger.error("Seed failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "Seed failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    settings: {
      shopifyDomain: process.env.SHOPIFY_DOMAIN || null,
      fromEmail: process.env.RESEND_FROM_EMAIL || null,
      fromName: process.env.RESEND_FROM_NAME || null,
      supabaseAuthConfigured: Boolean(
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    },
  });
}

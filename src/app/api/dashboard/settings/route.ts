export async function GET() {
  return Response.json({
    settings: {
      shopifyDomain: process.env.SHOPIFY_DOMAIN || null,
      slackChannelId: process.env.SLACK_CHANNEL_ID || null,
      fromEmail: process.env.RESEND_FROM_EMAIL || null,
      fromName: process.env.RESEND_FROM_NAME || null,
    },
  });
}

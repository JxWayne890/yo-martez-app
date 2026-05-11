Yo! Martez customer automation dashboard.

## Production Checklist

Set these environment variables before launch:

- `ADMIN_USERNAME` and `ADMIN_PASSWORD` protect `/dashboard/*` and `/api/dashboard/*`.
- `SHOPIFY_DOMAIN`, `SHOPIFY_ADMIN_TOKEN`, and `SHOPIFY_API_SECRET` power Shopify catalog, draft orders, and webhooks.
- `GEMINI_API_KEY` powers plain-English draft order parsing.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` send customer emails.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` store customer, access request, draft order, and dispatch data.
- `CRON_SECRET` protects cron/admin maintenance endpoints.

The Slack/n8n workflow has been replaced by in-app screens:

- `/dashboard/draft-orders` creates Shopify draft orders from typed order details and emails the invoice.
- `/dashboard/password` broadcasts a new members-only store password to customers and approved access requests.

## Getting Started!

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

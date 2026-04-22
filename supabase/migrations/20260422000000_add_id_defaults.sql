-- Add database-level defaults for id columns that previously relied on
-- Prisma's application-level @default(cuid()). Supabase JS inserts the
-- rows directly, so without a real default the NOT NULL id constraint
-- fires on every insert.

ALTER TABLE "EmailTemplate"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "CustomerEventLog"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "AbandonedCartTracking"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "DraftOrderLog"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "CustomerProfile"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "AccessRequest"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "AutomationDispatch"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

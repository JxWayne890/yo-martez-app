-- Drop the Store table and all storeId FK columns on child tables.
-- Apply via Supabase dashboard SQL editor after deploying the single-tenant app.
--
-- Child tables keep their data; only the storeId column and its FK constraint go away.
-- Unique/index constraints that include storeId are dropped too so they can be recreated
-- on single-tenant columns if needed later.

begin;

alter table if exists "WebhookRegistration" drop constraint if exists "WebhookRegistration_storeId_fkey";
alter table if exists "EmailTemplate" drop constraint if exists "EmailTemplate_storeId_fkey";
alter table if exists "CustomerEventLog" drop constraint if exists "CustomerEventLog_storeId_fkey";
alter table if exists "AbandonedCartTracking" drop constraint if exists "AbandonedCartTracking_storeId_fkey";
alter table if exists "DraftOrderLog" drop constraint if exists "DraftOrderLog_storeId_fkey";
alter table if exists "CustomerProfile" drop constraint if exists "CustomerProfile_storeId_fkey";
alter table if exists "AccessRequest" drop constraint if exists "AccessRequest_storeId_fkey";
alter table if exists "AutomationDispatch" drop constraint if exists "AutomationDispatch_storeId_fkey";

alter table if exists "WebhookRegistration" drop constraint if exists "WebhookRegistration_storeId_topic_key";
alter table if exists "EmailTemplate" drop constraint if exists "EmailTemplate_storeId_slug_key";
alter table if exists "AbandonedCartTracking" drop constraint if exists "AbandonedCartTracking_storeId_shopifyCheckoutId_key";
alter table if exists "CustomerProfile" drop constraint if exists "CustomerProfile_storeId_email_key";
alter table if exists "AutomationDispatch" drop constraint if exists "AutomationDispatch_storeId_automationKey_stageKey_entityType_entityId_key";

drop index if exists "WebhookRegistration_storeId_topic_key";
drop index if exists "EmailTemplate_storeId_slug_key";
drop index if exists "CustomerEventLog_storeId_shopifyCustomerId_idx";
drop index if exists "CustomerEventLog_storeId_eventType_idx";
drop index if exists "AbandonedCartTracking_storeId_shopifyCheckoutId_key";
drop index if exists "AbandonedCartTracking_storeId_isCompleted_currentStage_idx";
drop index if exists "AbandonedCartTracking_storeId_customerEmail_idx";
drop index if exists "DraftOrderLog_storeId_idx";
drop index if exists "CustomerProfile_storeId_email_key";
drop index if exists "CustomerProfile_storeId_shopifyCustomerId_idx";
drop index if exists "CustomerProfile_storeId_birthday_idx";
drop index if exists "AccessRequest_storeId_email_idx";
drop index if exists "AccessRequest_storeId_accessGrantedAt_idx";
drop index if exists "AutomationDispatch_storeId_automationKey_stageKey_entityType_entityId_key";
drop index if exists "AutomationDispatch_storeId_automationKey_customerEmail_idx";

alter table if exists "WebhookRegistration" drop column if exists "storeId";
alter table if exists "EmailTemplate" drop column if exists "storeId";
alter table if exists "CustomerEventLog" drop column if exists "storeId";
alter table if exists "AbandonedCartTracking" drop column if exists "storeId";
alter table if exists "DraftOrderLog" drop column if exists "storeId";
alter table if exists "CustomerProfile" drop column if exists "storeId";
alter table if exists "AccessRequest" drop column if exists "storeId";
alter table if exists "AutomationDispatch" drop column if exists "storeId";
alter table if exists "JobLog" drop column if exists "storeId";

create unique index if not exists "EmailTemplate_slug_key"
  on "EmailTemplate" ("slug");

create unique index if not exists "CustomerProfile_email_key"
  on "CustomerProfile" ("email");

create unique index if not exists "AbandonedCartTracking_shopifyCheckoutId_key"
  on "AbandonedCartTracking" ("shopifyCheckoutId");

create unique index if not exists "AutomationDispatch_lookup_key"
  on "AutomationDispatch" ("automationKey", "stageKey", "entityType", "entityId");

drop table if exists "Store";

commit;

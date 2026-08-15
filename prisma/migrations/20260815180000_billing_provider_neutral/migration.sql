-- Rename the billing columns to provider-neutral names so switching payment
-- provider (Stripe -> Polar, and back if Stripe ever supports the country)
-- is a code change, not a data migration. RENAME preserves existing values.

ALTER TABLE "Company" RENAME COLUMN "stripeCustomerId" TO "billingCustomerId";
ALTER TABLE "Company" RENAME COLUMN "stripeSubscriptionId" TO "billingSubscriptionId";
ALTER TABLE "Company" RENAME COLUMN "stripePriceId" TO "billingProductId";

-- Keep index names in sync with the columns they cover
ALTER INDEX "Company_stripeCustomerId_key" RENAME TO "Company_billingCustomerId_key";
ALTER INDEX "Company_stripeSubscriptionId_key" RENAME TO "Company_billingSubscriptionId_key";

-- Which provider the ids above belong to
ALTER TABLE "Company" ADD COLUMN "billingProvider" TEXT;

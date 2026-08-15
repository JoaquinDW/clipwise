-- AlterTable: billing / subscription state on Company
ALTER TABLE "Company" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "plan" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "minutesResetAt" TIMESTAMP(3);

-- AlterColumn: minutesUsed is rendered with .toFixed(1), so it needs to be a float
ALTER TABLE "Company" ALTER COLUMN "minutesUsed" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeSubscriptionId_key" ON "Company"("stripeSubscriptionId");

-- AlterTable: idempotency guard so a retry never bills the same video twice
ALTER TABLE "Video" ADD COLUMN     "minutesMetered" BOOLEAN NOT NULL DEFAULT false;

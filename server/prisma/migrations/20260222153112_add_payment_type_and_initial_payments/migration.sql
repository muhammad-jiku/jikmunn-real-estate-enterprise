-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SecurityDeposit', 'FirstMonthRent', 'ApplicationFee', 'MonthlyRent', 'InitialPayment');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'AwaitingPayment';

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_leaseId_fkey";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "applicationId" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "gracePeriodDays" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "paymentType" "PaymentType" NOT NULL DEFAULT 'MonthlyRent',
ALTER COLUMN "leaseId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

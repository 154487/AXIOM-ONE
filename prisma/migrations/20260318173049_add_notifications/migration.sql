-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRANSACTION', 'BUDGET_ALERT', 'MONTHLY_REPORT', 'SYSTEM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifBudgetAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifMonthlyReport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifTransactions" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

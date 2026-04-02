-- AlterTable
ALTER TABLE "users" ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3),
ADD COLUMN     "otpField" TEXT,
ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingPhone" TEXT;

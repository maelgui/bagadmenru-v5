-- AlterTable
ALTER TABLE "Authenticator" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "friendlyName" TEXT,
ADD COLUMN     "lastUsed" TIMESTAMP(3);

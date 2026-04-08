-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentIntentId" TEXT;

-- CreateTable
CREATE TABLE "WalletPaymentIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "returnToken" TEXT NOT NULL,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletPaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletPaymentIntent_idempotencyKey_key" ON "WalletPaymentIntent"("idempotencyKey");
CREATE INDEX "WalletPaymentIntent_userId_createdAt_idx" ON "WalletPaymentIntent"("userId", "createdAt" DESC);

ALTER TABLE "WalletPaymentIntent" ADD CONSTRAINT "WalletPaymentIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

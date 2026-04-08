-- CreateTable
CREATE TABLE "PaymentGatewaySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultProvider" TEXT NOT NULL DEFAULT 'mock',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewaySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderConfig" (
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "publicKey" TEXT,
    "secretKey" TEXT,
    "callbackUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderConfig_pkey" PRIMARY KEY ("provider")
);

INSERT INTO "PaymentGatewaySettings" ("id", "defaultProvider", "updatedAt")
VALUES ('default', 'mock', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PaymentProviderConfig" ("provider", "enabled", "publicKey", "secretKey", "callbackUrl", "updatedAt")
VALUES
  ('mock', true, NULL, NULL, NULL, CURRENT_TIMESTAMP),
  ('cashier', false, NULL, NULL, NULL, CURRENT_TIMESTAMP),
  ('paymob', false, NULL, NULL, NULL, CURRENT_TIMESTAMP),
  ('stripe', false, NULL, NULL, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("provider") DO NOTHING;

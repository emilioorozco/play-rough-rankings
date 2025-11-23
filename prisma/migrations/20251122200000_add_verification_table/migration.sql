-- CreateTable: verification
-- This migration creates the verification table if it doesn't exist
-- This table is required by Better Auth for email verification and password reset tokens

CREATE TABLE IF NOT EXISTS "public"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- Create index on identifier for faster lookups
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "public"."verification"("identifier");

-- Create index on value for token lookups
CREATE INDEX IF NOT EXISTS "verification_value_idx" ON "public"."verification"("value");

-- Create index on expiresAt for cleanup queries
CREATE INDEX IF NOT EXISTS "verification_expiresAt_idx" ON "public"."verification"("expiresAt");





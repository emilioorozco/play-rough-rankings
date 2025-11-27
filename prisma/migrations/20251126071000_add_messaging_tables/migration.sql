-- CreateTable: message_bounces
-- Tracks all message delivery failures (email bounces, SMS failures, etc.)

CREATE TABLE IF NOT EXISTS "public"."message_bounces" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "bounceType" TEXT NOT NULL,
    "bounceSubType" TEXT NOT NULL,
    "diagnosticCode" TEXT,
    "action" TEXT,
    "status" TEXT,
    "feedbackId" TEXT,
    "messageId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_bounces_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "message_bounces_recipient_idx" ON "public"."message_bounces"("recipient");
CREATE INDEX IF NOT EXISTS "message_bounces_channel_idx" ON "public"."message_bounces"("channel");
CREATE INDEX IF NOT EXISTS "message_bounces_timestamp_idx" ON "public"."message_bounces"("timestamp");
CREATE INDEX IF NOT EXISTS "message_bounces_bounceType_idx" ON "public"."message_bounces"("bounceType");


-- CreateTable: message_complaints
-- Tracks all spam complaints (email complaints, SMS opt-outs, etc.)

CREATE TABLE IF NOT EXISTS "public"."message_complaints" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "complaintType" TEXT,
    "userAgent" TEXT,
    "feedbackId" TEXT,
    "messageId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_complaints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "message_complaints_recipient_idx" ON "public"."message_complaints"("recipient");
CREATE INDEX IF NOT EXISTS "message_complaints_channel_idx" ON "public"."message_complaints"("channel");
CREATE INDEX IF NOT EXISTS "message_complaints_timestamp_idx" ON "public"."message_complaints"("timestamp");


-- CreateTable: message_suppression_list
-- Suppression list - recipients that should not be contacted

CREATE TABLE IF NOT EXISTS "public"."message_suppression_list" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suppressionType" TEXT NOT NULL,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "lastBounceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_suppression_list_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one suppression per recipient per channel
CREATE UNIQUE INDEX IF NOT EXISTS "message_suppression_list_recipient_channel_key"
  ON "public"."message_suppression_list"("recipient", "channel");

CREATE INDEX IF NOT EXISTS "message_suppression_list_recipient_idx" ON "public"."message_suppression_list"("recipient");
CREATE INDEX IF NOT EXISTS "message_suppression_list_channel_idx" ON "public"."message_suppression_list"("channel");
CREATE INDEX IF NOT EXISTS "message_suppression_list_reason_idx" ON "public"."message_suppression_list"("reason");
CREATE INDEX IF NOT EXISTS "message_suppression_list_createdAt_idx" ON "public"."message_suppression_list"("createdAt");


-- CreateTable: message_delivery_logs
-- Comprehensive message delivery logging

CREATE TABLE IF NOT EXISTS "public"."message_delivery_logs" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "messageType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_delivery_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "message_delivery_logs_recipient_idx" ON "public"."message_delivery_logs"("recipient");
CREATE INDEX IF NOT EXISTS "message_delivery_logs_channel_idx" ON "public"."message_delivery_logs"("channel");
CREATE INDEX IF NOT EXISTS "message_delivery_logs_status_idx" ON "public"."message_delivery_logs"("status");
CREATE INDEX IF NOT EXISTS "message_delivery_logs_messageType_idx" ON "public"."message_delivery_logs"("messageType");
CREATE INDEX IF NOT EXISTS "message_delivery_logs_sentAt_idx" ON "public"."message_delivery_logs"("sentAt");



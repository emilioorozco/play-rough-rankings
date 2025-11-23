-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "playerSubmissions" JSONB;

-- CreateTable
CREATE TABLE "role_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_invitations_token_key" ON "role_invitations"("token");

-- CreateIndex
CREATE INDEX "role_invitations_email_idx" ON "role_invitations"("email");

-- CreateIndex
CREATE INDEX "role_invitations_token_idx" ON "role_invitations"("token");

-- CreateIndex
CREATE INDEX "role_invitations_expiresAt_idx" ON "role_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "matches_tournamentId_round_status_idx" ON "matches"("tournamentId", "round", "status");

-- CreateIndex
CREATE INDEX "tournament_entries_tournamentId_dropped_idx" ON "tournament_entries"("tournamentId", "dropped");

-- CreateIndex
CREATE INDEX "tournaments_status_date_idx" ON "tournaments"("status", "date");

-- AddForeignKey
ALTER TABLE "role_invitations" ADD CONSTRAINT "role_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

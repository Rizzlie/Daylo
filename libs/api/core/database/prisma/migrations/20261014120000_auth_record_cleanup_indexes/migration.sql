CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "sessions_created_at_idx" ON "sessions"("created_at");
CREATE INDEX "oauth_transactions_expires_at_idx" ON "oauth_transactions"("expires_at");

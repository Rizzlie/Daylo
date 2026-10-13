-- Nullable only for attempts started before PKCE; callbacks reject those records.
ALTER TABLE "oauth_transactions" ADD COLUMN "encrypted_verifier" VARCHAR(128);

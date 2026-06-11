-- Create user_oauth_account table to bind local users to third-party OAuth identities (e.g. kun-oauth).
-- (provider, provider_user_id) is uniquely constrained so one external identity maps to one local user.
CREATE TABLE IF NOT EXISTS "user_oauth_account" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "provider_user_id" VARCHAR(100) NOT NULL,
  "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP(3) NOT NULL
);

-- Index to look up all OAuth bindings of a given user
CREATE INDEX IF NOT EXISTS "user_oauth_account_user_id_idx"
ON "user_oauth_account" ("user_id");

-- One external identity (provider + provider_user_id) maps to at most one row
CREATE UNIQUE INDEX IF NOT EXISTS "user_oauth_account_provider_provider_user_id_key"
ON "user_oauth_account" ("provider", "provider_user_id");

-- Foreign key linking to user table, cascade on delete so bindings drop with the user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_oauth_account_user_id_fkey'
  ) THEN
    ALTER TABLE "user_oauth_account"
    ADD CONSTRAINT "user_oauth_account_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END;
$$;

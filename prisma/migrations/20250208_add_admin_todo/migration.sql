-- Create admin_todo table to store site todo items
CREATE TABLE IF NOT EXISTS "admin_todo" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(233) NOT NULL,
  "description" VARCHAR(1007) NOT NULL DEFAULT '',
  "status" INTEGER NOT NULL DEFAULT 0,
  "user_id" INTEGER,
  "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure updated timestamp auto-updates on modification
CREATE OR REPLACE FUNCTION update_admin_todo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_admin_todo_timestamp'
  ) THEN
    CREATE TRIGGER set_admin_todo_timestamp
    BEFORE UPDATE ON "admin_todo"
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_todo_timestamp();
  END IF;
END;
$$;

-- Add foreign key constraint linking to user table
ALTER TABLE "admin_todo"
ADD CONSTRAINT IF NOT EXISTS "admin_todo_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Optional index to query by status and creation order
CREATE INDEX IF NOT EXISTS "admin_todo_status_created_idx"
ON "admin_todo" ("status", "created");

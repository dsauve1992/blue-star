-- Revert user_id back to UUID (this will fail if data exists that's not UUID format)
ALTER TABLE positions ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
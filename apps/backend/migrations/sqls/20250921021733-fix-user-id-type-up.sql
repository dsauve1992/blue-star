-- Change user_id from UUID to VARCHAR to support external auth systems
ALTER TABLE positions ALTER COLUMN user_id TYPE VARCHAR(255);
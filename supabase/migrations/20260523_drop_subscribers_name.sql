-- Remove the unused name column from subscribers
ALTER TABLE subscribers DROP COLUMN IF EXISTS name;

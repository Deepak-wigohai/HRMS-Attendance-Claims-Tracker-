-- Adds incentive columns to users table if they don't exist
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS morning_incentive INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS evening_incentive INTEGER DEFAULT 100;



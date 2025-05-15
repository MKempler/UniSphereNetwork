-- Migration: Add DID and federation columns to users table
ALTER TABLE users
  ADD COLUMN did TEXT UNIQUE,
  ADD COLUMN public_key TEXT,
  ADD COLUMN home_node TEXT; 
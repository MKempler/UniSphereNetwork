-- Migration to add parent_id column to comments table for threaded comments
-- Run date: 2024-12-22

-- Add parent_id column to comments table
ALTER TABLE comments 
ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;

-- Add index for better performance on parent_id queries
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Add index for better performance on post_id + parent_id queries  
CREATE INDEX idx_comments_post_parent ON comments(post_id, parent_id); 
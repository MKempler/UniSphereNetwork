-- Add quoted_post_id column to posts table for quote posts functionality
ALTER TABLE posts ADD COLUMN quoted_post_id INTEGER REFERENCES posts(id);

-- Create index for better performance when querying quote posts
CREATE INDEX idx_posts_quoted_post_id ON posts(quoted_post_id);

-- Create index for better performance when querying posts that are quoted
CREATE INDEX idx_posts_quoted_by ON posts(id) WHERE id IN (SELECT quoted_post_id FROM posts WHERE quoted_post_id IS NOT NULL); 
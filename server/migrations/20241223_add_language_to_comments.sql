ALTER TABLE comments ADD COLUMN language TEXT DEFAULT 'en' NOT NULL;
COMMENT ON COLUMN comments.language IS 'The detected language of the comment content, defaults to English.'; 
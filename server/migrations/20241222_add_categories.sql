-- Add categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'HelpCircle',
  color VARCHAR(20) DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add category_id column to circuits table
ALTER TABLE circuits ADD COLUMN category_id INTEGER REFERENCES categories(id);

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, color, sort_order, is_active) VALUES
('Technology', 'tech', 'Latest in tech, gadgets, and code.', 'Tv', '#6366F1', 1, true),
('Music & Entertainment', 'music', 'Tune in to the beat and the big screen.', 'Music4', '#EC4899', 2, true),
('Learning & Ideas', 'learning', 'Expand your mind and share knowledge.', 'Lightbulb', '#F59E0B', 3, true),
('Animals & Nature', 'animals', 'From furry friends to wild wonders.', 'Bone', '#10B981', 4, true),
('Sports & Fitness', 'sports', 'Scores, highlights, and fan discussions.', 'Dumbbell', '#EF4444', 5, true),
('News & Politics', 'news', 'Stay informed with current events.', 'Newspaper', '#374151', 6, true),
('Gaming', 'gaming', 'Video games, esports, and gaming culture.', 'Gamepad2', '#8B5CF6', 7, true),
('Art & Design', 'art', 'Creative expression and visual arts.', 'Palette', '#F97316', 8, true),
('Science & Research', 'science', 'Scientific discoveries and research.', 'Microscope', '#0EA5E9', 9, true),
('General Discussion', 'general', 'Open conversations on any topic.', 'MessageCircle', '#6B7280', 10, true);

-- Auto-assign existing circuits to categories based on their names (basic heuristic)
UPDATE circuits SET category_id = (SELECT id FROM categories WHERE slug = 'tech' LIMIT 1) 
WHERE (name ILIKE '%tech%' OR description ILIKE '%tech%') AND category_id IS NULL;

UPDATE circuits SET category_id = (SELECT id FROM categories WHERE slug = 'music' LIMIT 1) 
WHERE (name ILIKE '%music%' OR description ILIKE '%music%' OR name ILIKE '%entertainment%') AND category_id IS NULL;

UPDATE circuits SET category_id = (SELECT id FROM categories WHERE slug = 'animals' LIMIT 1) 
WHERE (name ILIKE '%animal%' OR description ILIKE '%animal%' OR name ILIKE '%nature%') AND category_id IS NULL;

UPDATE circuits SET category_id = (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1) 
WHERE (name ILIKE '%sport%' OR description ILIKE '%sport%' OR name ILIKE '%fitness%') AND category_id IS NULL;

UPDATE circuits SET category_id = (SELECT id FROM categories WHERE slug = 'gaming' LIMIT 1) 
WHERE (name ILIKE '%game%' OR name ILIKE '%gaming%' OR description ILIKE '%game%') AND category_id IS NULL;

UPDATE circuits SET category_id = (SELECT id FROM categories WHERE slug = 'art' LIMIT 1) 
WHERE (name ILIKE '%art%' OR name ILIKE '%design%' OR description ILIKE '%art%') AND category_id IS NULL;

UPDATE circuits SET category_id = (SELECT id FROM categories WHERE slug = 'news' LIMIT 1) 
WHERE (name ILIKE '%news%' OR name ILIKE '%politics%' OR description ILIKE '%news%') AND category_id IS NULL;

-- Assign remaining circuits to general discussion
UPDATE circuits SET category_id = (SELECT id FROM categories WHERE slug = 'general' LIMIT 1) 
WHERE category_id IS NULL; 
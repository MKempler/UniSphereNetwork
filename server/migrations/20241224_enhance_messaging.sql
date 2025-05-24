-- Enhanced messaging features migration

-- Add new columns to messages table for replies and file attachments
ALTER TABLE messages 
ADD COLUMN reply_to_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN file_url TEXT,
ADD COLUMN file_name TEXT,
ADD COLUMN file_type TEXT,
ADD COLUMN file_size INTEGER;

-- Create message reactions table
CREATE TABLE message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL, -- Store emoji as text (e.g., '👍', '❤️', '😂')
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji) -- One reaction per user per message per emoji
);

-- Add admin roles to conversation participants
ALTER TABLE conversation_participants 
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Create conversation settings table for group management
CREATE TABLE conversation_settings (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
  allow_member_add BOOLEAN NOT NULL DEFAULT TRUE, -- Can members add other members
  allow_member_remove BOOLEAN NOT NULL DEFAULT FALSE, -- Can members remove others (admin only)
  allow_name_change BOOLEAN NOT NULL DEFAULT TRUE, -- Can members change group name
  mute_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX idx_conversation_participants_admin ON conversation_participants(conversation_id, is_admin);

-- Full text search index for message content
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- Update conversations updated_at when settings change
CREATE OR REPLACE FUNCTION update_conversation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_settings_updated_at
  AFTER INSERT OR UPDATE ON conversation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_settings_updated_at();

-- Insert default settings for existing conversations
INSERT INTO conversation_settings (conversation_id)
SELECT id FROM conversations
WHERE id NOT IN (SELECT conversation_id FROM conversation_settings); 
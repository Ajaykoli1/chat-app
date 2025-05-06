-- Add file-related columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS file_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100); 
-- Add verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_type VARCHAR(20) DEFAULT 'social';
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_link TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS college_name VARCHAR(100);

-- Create a table for admin approvals
CREATE TABLE IF NOT EXISTS verification_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    admin_notes TEXT
);

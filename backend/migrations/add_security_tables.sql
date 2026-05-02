-- ============================================================================
-- SECURITY MIGRATION: Email OTP + IP Registration Tracking
-- Run once on your database: psql -U crush_user -d crush_detector_db -f this_file.sql
-- ============================================================================

-- Email OTP table for account verification
CREATE TABLE IF NOT EXISTS email_otps (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON email_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON email_otps(expires_at);

-- Ensure is_email_verified defaults to false (secure default)
ALTER TABLE users ALTER COLUMN is_email_verified SET DEFAULT false;

-- Update existing unverified accounts (set any that slipped through)
-- Comment this out if you want to keep existing accounts verified
-- UPDATE users SET is_email_verified = false WHERE is_email_verified = true AND created_at > NOW() - INTERVAL '1 day';

-- ============================================================================
-- MUTUAL CRUSH DETECTOR - DATABASE SCHEMA
-- ============================================================================
-- This database stores user accounts, crush declarations, and match results

-- Create ENUM types for better data integrity
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'deleted');
CREATE TYPE match_status AS ENUM ('matched', 'unrequited', 'rejected', 'pending');

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores basic user information and authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile Information
    display_name VARCHAR(100) NOT NULL,
    profile_photo_url VARCHAR(500),
    bio TEXT,
    date_of_birth DATE,
    
    -- Metadata
    status user_status DEFAULT 'active',
    is_email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    profile_completion_percentage INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for faster queries
    CHECK (char_length(username) >= 3),
    CHECK (char_length(password_hash) > 0)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================================
-- CRUSH DECLARATIONS TABLE
-- ============================================================================
-- Records who has a crush on whom
CREATE TABLE crush_declarations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- The crush's information
    crush_username VARCHAR(50) NOT NULL,  -- Username of the crush (not ID, in case they haven't joined yet)
    crush_display_name VARCHAR(100),      -- Display name of crush (for UI purposes)
    crush_user_id INT REFERENCES users(id) ON DELETE SET NULL,  -- NULL if crush hasn't joined yet
    
    -- Metadata
    is_anonymous BOOLEAN DEFAULT false,   -- User can keep their identity hidden initially
    confidence_level INT CHECK (confidence_level BETWEEN 1 AND 10),  -- 1-10 scale
    notes TEXT,  -- Optional private notes why they like this person
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'active',
    
    -- Timestamps
    declared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate declarations from same user to same crush
    UNIQUE(user_id, crush_username)
);

CREATE INDEX idx_crush_user_id ON crush_declarations(user_id);
CREATE INDEX idx_crush_username ON crush_declarations(crush_username);
CREATE INDEX idx_crush_declared_at ON crush_declarations(declared_at DESC);

-- ============================================================================
-- MATCHES TABLE
-- ============================================================================
-- Records mutual crush matches and results
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    user_1_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_2_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Match information
    match_status match_status NOT NULL,  -- matched, unrequited, rejected
    mutual_at TIMESTAMP,  -- When the mutual match was confirmed
    
    -- Privacy and visibility
    is_private BOOLEAN DEFAULT false,  -- Both users must agree to reveal
    user_1_aware BOOLEAN DEFAULT true,  -- Does user 1 know about this match?
    user_2_aware BOOLEAN DEFAULT true,  -- Does user 2 know about this match?
    
    -- User reactions
    user_1_reaction VARCHAR(50),  -- 'happy', 'excited', 'surprised', etc.
    user_2_reaction VARCHAR(50),
    
    -- Message exchange
    initial_message TEXT,  -- First message if match is confirmed
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure users are different and order doesn't create duplicates
    CHECK (user_1_id < user_2_id),
    CONSTRAINT valid_match_users UNIQUE(user_1_id, user_2_id)
);

CREATE INDEX idx_matches_user_1 ON matches(user_1_id);
CREATE INDEX idx_matches_user_2 ON matches(user_2_id);
CREATE INDEX idx_matches_status ON matches(match_status);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- ============================================================================
-- MATCH HISTORY TABLE
-- ============================================================================
-- Tracks history of match status changes for analytics
CREATE TABLE match_history (
    id SERIAL PRIMARY KEY,
    match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_status match_status,
    new_status match_status NOT NULL,
    action_description VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_match_history_match_id ON match_history(match_id);
CREATE INDEX idx_match_history_user_id ON match_history(user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Manages notifications for users
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) NOT NULL,  -- 'match', 'profile_view', 'message', etc.
    title VARCHAR(200) NOT NULL,
    message TEXT,
    
    -- Related entities
    related_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    related_match_id INT REFERENCES matches(id) ON DELETE SET NULL,
    
    is_read BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- USER SESSIONS TABLE
-- ============================================================================
-- Track user login sessions and JWT tokens
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- PROFILE VIEWS TABLE
-- ============================================================================
-- Track who has viewed whose profile (for analytics and match discovery)
CREATE TABLE profile_views (
    id SERIAL PRIMARY KEY,
    viewer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    view_count INT DEFAULT 1,
    last_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (viewer_id != viewed_user_id)
);

CREATE INDEX idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX idx_profile_views_viewed_user_id ON profile_views(viewed_user_id);
CREATE UNIQUE INDEX idx_profile_views_unique ON profile_views(viewer_id, viewed_user_id);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to crush_declarations
CREATE TRIGGER update_crush_declarations_updated_at
BEFORE UPDATE ON crush_declarations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to matches
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-create match when both users have crush on each other
CREATE OR REPLACE FUNCTION check_and_create_mutual_crush()
RETURNS TRIGGER AS $$
DECLARE
    mutual_crush_exists BOOLEAN;
    user1_id INT;
    user2_id INT;
BEGIN
    -- Check if the crush_user_id exists and has declared a crush back
    IF NEW.crush_user_id IS NOT NULL THEN
        mutual_crush_exists := EXISTS (
            SELECT 1 FROM crush_declarations
            WHERE user_id = NEW.crush_user_id
            AND crush_user_id = NEW.user_id
            AND status = 'active'
        );
        
        IF mutual_crush_exists THEN
            -- Ensure consistent ordering (smaller ID first)
            IF NEW.user_id < NEW.crush_user_id THEN
                user1_id := NEW.user_id;
                user2_id := NEW.crush_user_id;
            ELSE
                user1_id := NEW.crush_user_id;
                user2_id := NEW.user_id;
            END IF;
            
            -- Create or update match (insert if not exists)
            INSERT INTO matches (user_1_id, user_2_id, match_status, mutual_at)
            VALUES (user1_id, user2_id, 'matched', CURRENT_TIMESTAMP)
            ON CONFLICT (user_1_id, user_2_id) 
            DO UPDATE SET 
                match_status = 'matched',
                mutual_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to crush_declarations
CREATE TRIGGER trigger_check_mutual_crush
AFTER INSERT OR UPDATE ON crush_declarations
FOR EACH ROW
EXECUTE FUNCTION check_and_create_mutual_crush();

-- ============================================================================
-- SAMPLE DATA (For Testing)
-- ============================================================================
-- Uncomment to insert test data

/*
INSERT INTO users (username, email, password_hash, display_name, bio, status, is_email_verified)
VALUES 
    ('alice_wonder', 'alice@example.com', '$2b$10$..', 'Alice Wonder', 'Love hiking and coffee', 'active', true),
    ('bob_builder', 'bob@example.com', '$2b$10$..', 'Bob Builder', 'Tech enthusiast', 'active', true),
    ('charlie_brown', 'charlie@example.com', '$2b$10$..', 'Charlie Brown', 'Artist and dreamer', 'active', true);
*/

-- ============================================================================
-- DATABASE VIEWS (For easier querying)
-- ============================================================================

-- View: Active mutual matches
CREATE VIEW v_mutual_matches AS
SELECT 
    m.id as match_id,
    u1.id as user_1_id,
    u1.username as user_1_username,
    u1.display_name as user_1_display_name,
    u1.profile_photo_url as user_1_photo,
    u2.id as user_2_id,
    u2.username as user_2_username,
    u2.display_name as user_2_display_name,
    u2.profile_photo_url as user_2_photo,
    m.match_status,
    m.mutual_at,
    m.created_at
FROM matches m
JOIN users u1 ON m.user_1_id = u1.id
JOIN users u2 ON m.user_2_id = u2.id
WHERE m.match_status = 'matched';

-- View: User crush status
CREATE VIEW v_user_crush_status AS
SELECT 
    cd.user_id,
    cd.crush_username,
    u.username as crush_actual_username,
    u.display_name as crush_display_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM crush_declarations
            WHERE user_id = cd.crush_user_id
            AND crush_user_id = cd.user_id
            AND status = 'active'
        ) THEN 'mutual'
        WHEN cd.crush_user_id IS NOT NULL THEN 'unrequited'
        ELSE 'not_found'
    END as crush_status
FROM crush_declarations cd
LEFT JOIN users u ON cd.crush_user_id = u.id
WHERE cd.status = 'active';

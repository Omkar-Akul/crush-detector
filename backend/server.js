// ============================================================================
// MUTUAL CRUSH DETECTOR - MAIN SERVER FILE
// ============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
require('dotenv').config();
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Render/Vercel Proxy Trust (Required for Rate Limiter)
app.set('trust proxy', 1);

// ============================================================================
// EMAIL + OTP UTILITIES (BREVO WEB API)
// ============================================================================

const axios = require('axios');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp, displayName) => {
    const fromEmail = process.env.BREVO_FROM || process.env.BREVO_USER;
    const apiKey = process.env.BREVO_PASS;

    if (!apiKey) {
        console.log(`\n🔑 [DEV MODE] OTP for ${email}: ${otp}\n`);
        return;
    }

    try {
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: "CrushDetector", email: fromEmail },
            to: [{ email: email, name: displayName }],
            subject: "Verify your CrushDetector account",
            htmlContent: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;background:#1a1a2e;color:#fff;border-radius:12px;padding:32px">
                    <h1 style="color:#FF6B9D;margin:0 0 8px">💘 CrushDetector</h1>
                    <h2 style="margin:0 0 24px;color:#fff">Verify your email</h2>
                    <p style="color:#ccc">Hi ${displayName}, welcome! Use this code to verify your account:</p>
                    <div style="background:#FF6B9D;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
                        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#fff">${otp}</span>
                    </div>
                    <p style="color:#999;font-size:13px">This code expires in 15 minutes. Do not share it with anyone.</p>
                </div>
            `
        }, {
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        console.log(`✓ Email sent via Brevo API (Axios) to ${email}`);
    } catch (err) {
        console.error('❌ Brevo API Error:', err.response ? err.response.data : err.message);
        throw err;
    }
};

// Auto-create security and verification tables on startup
(async () => {
    try {
        // 1. Email OTPs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS email_otps (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                otp_code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT false,
                attempts INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Add verification fields to users
        await db.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_type VARCHAR(20) DEFAULT 'social';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id_url TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS social_link TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS college_name VARCHAR(100);
        `);

        // 3. Verification requests table
        await db.query(`
            CREATE TABLE IF NOT EXISTS verification_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'pending',
                submitted_at TIMESTAMP DEFAULT NOW(),
                reviewed_at TIMESTAMP,
                admin_notes TEXT
            );
        `);

        console.log('✓ Security & Verification tables ready');
    } catch (err) {
        console.error('Warning: Could not setup database tables:', err.message);
    }
})();

// IP registration limiter (max 3 accounts per IP per 7 days)
// IP registration limiter (max 3 accounts per IP per 7 days - disabled in dev)
const ipRegistrationLimiter = rateLimit({
    windowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    max: process.env.NODE_ENV === 'development' ? 999999 : 3,
    message: { success: false, error: 'Too many accounts created from this IP. Try again later.', code: 'IP_LIMIT_EXCEEDED' },
    standardHeaders: true,
    legacyHeaders: false
});


// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // stricter limit for auth endpoints
    skipSuccessfulRequests: true
});

app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required',
            code: 'AUTHENTICATION_ERROR'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token',
                code: 'AUTHENTICATION_ERROR'
            });
        }
        
        req.user = user;
        next();
    });
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    
    next();
};

// ============================================================================
// ROUTE HANDLERS (SIMPLIFIED)
// ============================================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// ============================================================================
// A. AUTHENTICATION ROUTES
// ============================================================================

const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Cloudinary Configuration
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'crush_detector_ids',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Serve static public files
app.use(express.static(path.join(__dirname, 'public')));

// Generate JWT token
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            userId: user.id
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '30d' }
    );
};

// POST /api/auth/register
app.post('/api/auth/register', upload.single('student_id_photo'), authLimiter, ipRegistrationLimiter, async (req, res) => {
    try {
        const { username, email, password, display_name, date_of_birth, verification_type, social_link, college_name } = req.body;
        const student_id_url = req.file ? req.file.path : null;
        
        // Validation
        if (!username || !email || !password || !display_name || !verification_type) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Verification Specific Validation
        if (verification_type === 'college') {
            if (!college_name || !student_id_url) {
                return res.status(400).json({ success: false, error: 'College name and ID card photo are required for students' });
            }
            // Optional: Force college email domain check if you have a list of domains
        } else if (verification_type === 'social') {
            if (!social_link) {
                return res.status(400).json({ success: false, error: 'Instagram or LinkedIn link is required for external users' });
            }
        }
        
        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }
        
        // Check if user exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'Username or email already exists', code: 'DUPLICATE_ENTRY' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await db.query(
            `INSERT INTO users (
                username, email, password_hash, display_name, date_of_birth, 
                status, is_email_verified, verification_type, social_link, 
                student_id_url, college_name, is_identity_verified
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, username, email, display_name`,
            [
                username, email, hashedPassword, display_name, date_of_birth, 
                'active', false, verification_type, social_link || null, 
                student_id_url, college_name || null, false
            ]
        );
        
        const user = result.rows[0];

        // Create initial verification request
        await db.query(
            'INSERT INTO verification_requests (user_id, status) VALUES ($1, $2)',
            [user.id, 'pending']
        );
        
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        
        // Store session
        await db.query(
            `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
            [user.id, refreshToken, req.ip, req.get('user-agent')]
        );
        
        // Generate and store OTP
        const otp = generateOTP();
        await db.query(
            `INSERT INTO email_otps (user_id, otp_code, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
            [user.id, otp]
        );
        
        // Send OTP email (non-blocking for registration success)
        try {
            await sendOTPEmail(email, otp, display_name);
            console.log(`✓ OTP sent successfully to ${email}`);
        } catch (emailError) {
            console.error('❌ Failed to send OTP email:', emailError.message);
            // We don't throw here so the user registration still succeeds
        }
        
        res.status(201).json({
            success: true,
            message: 'Account created! Please check your email for a verification code.',
            requiresVerification: true,
            user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name, is_email_verified: false },
            tokens: { accessToken, refreshToken }
        });
    } catch (error) {
        console.error('CRITICAL: Registration error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error during registration',
            message: error.message 
        });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }
        
        // Find user
        const result = await db.query(
            'SELECT id, username, email, password_hash, display_name, profile_photo_url, is_email_verified FROM users WHERE username = $1 AND status = $2',
            [username, 'active']
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }
        
        const user = result.rows[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }
        
        // Update last login
        await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        
        // Store session
        await db.query(
            `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
            [user.id, refreshToken, req.ip, req.get('user-agent')]
        );
        
        res.json({
            success: true,
            requiresVerification: !user.is_email_verified,
            user: {
                id: user.id, username: user.username, email: user.email,
                display_name: user.display_name, profile_photo_url: user.profile_photo_url,
                is_email_verified: user.is_email_verified
            },
            tokens: { accessToken, refreshToken }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/auth/verify-email
app.post('/api/auth/verify-email', authenticateToken, async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.user.userId;
        
        if (!otp) return res.status(400).json({ success: false, error: 'OTP code required' });
        
        // Find valid OTP
        const otpResult = await db.query(
            `SELECT id, attempts FROM email_otps 
             WHERE user_id = $1 AND otp_code = $2 AND expires_at > NOW() AND used = false
             ORDER BY created_at DESC LIMIT 1`,
            [userId, otp.toString().trim()]
        );
        
        if (otpResult.rows.length === 0) {
            // Increment attempts on wrong OTP
            await db.query(
                `UPDATE email_otps SET attempts = attempts + 1 
                 WHERE user_id = $1 AND used = false AND expires_at > NOW()`,
                [userId]
            );
            return res.status(400).json({ success: false, error: 'Invalid or expired code. Please try again.', code: 'INVALID_OTP' });
        }
        
        // Mark OTP as used
        await db.query('UPDATE email_otps SET used = true WHERE id = $1', [otpResult.rows[0].id]);
        
        // Verify user's email
        await db.query('UPDATE users SET is_email_verified = true WHERE id = $1', [userId]);
        
        res.json({ success: true, message: 'Email verified! Welcome to CrushDetector 💘' });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/auth/resend-otp
const resendOtpLimiter = rateLimit({ windowMs: 60 * 1000, max: 1, message: { success: false, error: 'Please wait 1 minute before requesting another code.' } });
app.post('/api/auth/resend-otp', authenticateToken, resendOtpLimiter, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userResult = await db.query('SELECT email, display_name, is_email_verified FROM users WHERE id = $1', [userId]);
        
        if (!userResult.rows.length) return res.status(404).json({ success: false, error: 'User not found' });
        if (userResult.rows[0].is_email_verified) return res.status(400).json({ success: false, error: 'Email already verified' });
        
        const otp = generateOTP();
        await db.query(
            `INSERT INTO email_otps (user_id, otp_code, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
            [userId, otp]
        );
        try {
            await sendOTPEmail(userResult.rows[0].email, otp, userResult.rows[0].display_name);
            console.log(`✓ Resend OTP sent successfully to ${userResult.rows[0].email}`);
        } catch (emailError) {
            console.error('❌ Resend SMTP Error:', emailError.message);
        }
        
        res.json({ success: true, message: 'Verification code sent!' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


// POST /api/auth/refresh-token
app.post('/api/auth/refresh-token', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token required'
            });
        }
        
        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid refresh token'
                });
            }
            
            const newAccessToken = generateAccessToken(user);
            
            res.json({
                success: true,
                accessToken: newAccessToken
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        // Invalidate session
        await db.query(
            'UPDATE sessions SET is_active = false WHERE token = $1',
            [token]
        );
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// B. USER PROFILE ROUTES
// ============================================================================

// GET /api/users/me
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, email, display_name, bio, profile_photo_url, 
                    date_of_birth, created_at, status, is_email_verified,
                    verification_type, student_id_url, social_link, college_name, is_identity_verified
             FROM users WHERE id = $1`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/users/:username
app.get('/api/users/:username', optionalAuth, async (req, res) => {
    try {
        const { username } = req.params;
        
        const result = await db.query(
            `SELECT id, username, display_name, bio, profile_photo_url, 
                    date_of_birth, created_at, status
             FROM users WHERE username = $1 AND status = 'active'`,
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const user = result.rows[0];
        
        // Get stats
        const crushCount = await db.query(
            'SELECT COUNT(*) FROM crush_declarations WHERE user_id = $1 AND status = $2',
            [user.id, 'active']
        );
        
        const matchCount = await db.query(
            `SELECT COUNT(*) FROM matches 
             WHERE (user_1_id = $1 OR user_2_id = $1) AND match_status = 'matched'`,
            [user.id]
        );
        
        const viewCount = await db.query(
            'SELECT view_count FROM profile_views WHERE viewed_user_id = $1',
            [user.id]
        );
        
        res.json({
            success: true,
            user,
            stats: {
                crush_count: parseInt(crushCount.rows[0].count) || 0,
                match_count: parseInt(matchCount.rows[0].count) || 0,
                profile_views: viewCount.rows.reduce((sum, row) => sum + row.view_count, 0)
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// PUT /api/users/profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { display_name, bio, profile_photo_url } = req.body;
        const userId = req.user.userId;
        
        const result = await db.query(
            `UPDATE users 
             SET display_name = COALESCE($1, display_name),
                 bio = COALESCE($2, bio),
                 profile_photo_url = COALESCE($3, profile_photo_url)
             WHERE id = $4
             RETURNING id, username, email, display_name, bio, profile_photo_url`,
            [display_name, bio, profile_photo_url, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// C. CRUSH DECLARATION ROUTES
// ============================================================================

// POST /api/crushes/declare
app.post('/api/crushes/declare', authenticateToken, async (req, res) => {
    try {
        const { crush_username, confidence_level, is_anonymous } = req.body;
        const userId = req.user.userId;
        
        // ── SECURITY GATE 1: Email must be verified ────────────────────────
        const userCheck = await db.query(
            'SELECT is_email_verified, created_at FROM users WHERE id = $1',
            [userId]
        );
        if (!userCheck.rows[0].is_email_verified) {
            return res.status(403).json({
                success: false,
                error: 'Please verify your email before declaring a crush.',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }
        
        // ── SECURITY GATE 3: Max 5 crush declarations per 24 hours ────────
        const recentCrushes = await db.query(
            `SELECT COUNT(*) FROM crush_declarations 
             WHERE user_id = $1 AND declared_at > NOW() - INTERVAL '24 hours'`,
            [userId]
        );
        if (parseInt(recentCrushes.rows[0].count) >= 5) {
            return res.status(429).json({
                success: false,
                error: 'You can only declare up to 5 crushes per day. Try again tomorrow!',
                code: 'DAILY_LIMIT_EXCEEDED'
            });
        }
        
        // Validation
        if (!crush_username) {
            return res.status(400).json({
                success: false,
                error: 'Crush username required'
            });
        }
        
        if (crush_username === req.user.username) {
            return res.status(400).json({
                success: false,
                error: 'Cannot declare crush on yourself'
            });
        }

        
        // Check if crush exists
        const crushUser = await db.query(
            'SELECT id, display_name FROM users WHERE username = $1 AND status = $2',
            [crush_username, 'active']
        );
        
        if (crushUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const crushUserId = crushUser.rows[0].id;
        
        // Check if already declared
        const existing = await db.query(
            'SELECT id FROM crush_declarations WHERE user_id = $1 AND crush_user_id = $2 AND status = $3',
            [userId, crushUserId, 'active']
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'You already declared a crush on this person'
            });
        }
        
        // Create crush declaration
        const result = await db.query(
            `INSERT INTO crush_declarations 
            (user_id, crush_username, crush_user_id, confidence_level, is_anonymous, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
            RETURNING id, crush_username, crush_user_id, confidence_level, declared_at`,
            [userId, crush_username, crushUserId, confidence_level || 5, is_anonymous || false]
        );
        
        const crush = result.rows[0];
        
        // Check for mutual crush (automatic matching)
        const mutualCrush = await db.query(
            `SELECT id FROM crush_declarations 
             WHERE user_id = $1 AND crush_user_id = $2 AND status = 'active'`,
            [crushUserId, userId]
        );
        
        if (mutualCrush.rows.length > 0) {
            // Create match
            const user1Id = Math.min(userId, crushUserId);
            const user2Id = Math.max(userId, crushUserId);
            
            await db.query(
                `INSERT INTO matches (user_1_id, user_2_id, match_status, mutual_at)
                VALUES ($1, $2, 'matched', NOW())
                ON CONFLICT (user_1_id, user_2_id) 
                DO UPDATE SET match_status = 'matched', mutual_at = NOW()`,
                [user1Id, user2Id]
            );
            
            // Create notifications for BOTH users only on mutual match
            await db.query(
                `INSERT INTO notifications (user_id, notification_type, title, message, related_user_id)
                VALUES ($1, 'match', 'You matched!', $2, $3)`,
                [userId, `You matched with ${crushUser.rows[0].display_name}!`, crushUserId]
            );
            
            await db.query(
                `INSERT INTO notifications (user_id, notification_type, title, message, related_user_id)
                VALUES ($1, 'match', 'You matched!', $2, $3)`,
                [crushUserId, `You matched with ${req.user.username}!`, userId]
            );
        }
        
        // Determine crush status to return
        let crushStatus = 'no_crush_declared';
        let message = 'Crush declared successfully';
        
        if (mutualCrush.rows.length > 0) {
            crushStatus = 'mutual';
            message = 'Mutual crush detected! You matched!';
        } else {
            // Check if target is already in a mutual match with someone else
            const alreadyMatched = await db.query(
                `SELECT id FROM matches 
                 WHERE (user_1_id = $1 OR user_2_id = $1) AND match_status = 'matched' LIMIT 1`,
                [crushUserId]
            );
            if (alreadyMatched.rows.length > 0) {
                crushStatus = 'already_matched';
            } else {
                // Check if they have a crush on anyone
                const hasOtherCrush = await db.query(
                    `SELECT id FROM crush_declarations WHERE user_id = $1 AND status = 'active' LIMIT 1`,
                    [crushUserId]
                );
                if (hasOtherCrush.rows.length > 0) {
                    crushStatus = 'crushing_on_someone_else';
                }
            }
        }
        
        res.status(201).json({
            success: true,
            message,
            crush: {
                ...crush,
                crush_status: crushStatus
            }
        });
    } catch (error) {
        console.error('Error declaring crush:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/crushes/search
app.get('/api/crushes/search', authenticateToken, async (req, res) => {
    try {
        const { q, limit = 10, offset = 0 } = req.query;
        const userId = req.user.userId;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters'
            });
        }
        
        const searchTerm = `%${q.toLowerCase()}%`;
        
        const result = await db.query(
            `SELECT u.id, u.username, u.display_name, u.profile_photo_url, u.bio, u.is_email_verified,
                    EXISTS(SELECT 1 FROM crush_declarations WHERE user_id = $1 AND crush_user_id = u.id) as you_have_crush_on_them
             FROM users u
             WHERE (LOWER(u.username) LIKE $2 OR LOWER(u.display_name) LIKE $2)
             AND u.status = 'active'
             AND u.id != $1
             LIMIT $3 OFFSET $4`,
            [userId, searchTerm, limit, offset]
        );
        
        res.json({
            success: true,
            results: result.rows,
            total: result.rowCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/crushes/my-crushes
app.get('/api/crushes/my-crushes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await db.query(
            `SELECT cd.id, cd.crush_username, cd.confidence_level, cd.declared_at,
                    u.id as crush_id, u.display_name as crush_display_name, u.profile_photo_url,
                    CASE 
                        WHEN EXISTS(
                            SELECT 1 FROM crush_declarations 
                            WHERE user_id = cd.crush_user_id AND crush_user_id = cd.user_id AND status = 'active'
                        ) THEN 'mutual'
                        WHEN EXISTS(
                            SELECT 1 FROM matches 
                            WHERE (user_1_id = cd.crush_user_id OR user_2_id = cd.crush_user_id) AND match_status = 'matched'
                        ) THEN 'already_matched'
                        WHEN EXISTS(
                            SELECT 1 FROM crush_declarations 
                            WHERE user_id = cd.crush_user_id AND status = 'active'
                        ) THEN 'crushing_on_someone_else'
                        ELSE 'no_crush_declared'
                    END as crush_status
             FROM crush_declarations cd
             LEFT JOIN users u ON cd.crush_user_id = u.id
             WHERE cd.user_id = $1 AND cd.status = 'active'
             ORDER BY cd.declared_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            crushes: result.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/crushes/crushing-on-me
app.get('/api/crushes/crushing-on-me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await db.query(
            `SELECT cd.id, cd.declared_at, cd.confidence_level,
                    u.id as admirer_id, u.username, u.display_name, u.profile_photo_url,
                    CASE 
                        WHEN EXISTS(SELECT 1 FROM crush_declarations WHERE user_id = cd.user_id AND crush_user_id = cd.crush_user_id AND status = 'active')
                        THEN 'mutual'
                        ELSE 'not_mutual'
                    END as crush_status
             FROM crush_declarations cd
             JOIN users u ON cd.user_id = u.id
             WHERE cd.crush_user_id = $1 AND cd.status = 'active' AND cd.is_anonymous = false
             ORDER BY cd.declared_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            crushes: result.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// D. MATCH ROUTES
// ============================================================================

// GET /api/matches
app.get('/api/matches', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status = 'all', limit = 10, offset = 0 } = req.query;
        
        let query = `
            SELECT m.id, m.match_status, m.mutual_at, m.created_at,
                   m.user_1_reaction, m.user_2_reaction,
                   CASE WHEN m.user_1_id = $1 THEN m.user_2_id ELSE m.user_1_id END as other_user_id,
                   u.username, u.display_name, u.profile_photo_url, u.bio
            FROM matches m
            JOIN users u ON (CASE WHEN m.user_1_id = $1 THEN m.user_2_id ELSE m.user_1_id END) = u.id
            WHERE (m.user_1_id = $1 OR m.user_2_id = $1)
        `;
        
        const params = [userId];
        let paramCount = 2;
        
        if (status !== 'all') {
            query += ` AND m.match_status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        
        query += ` ORDER BY m.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Get stats
        const statsQuery = `
            SELECT match_status, COUNT(*) as count
            FROM matches
            WHERE user_1_id = $1 OR user_2_id = $1
            GROUP BY match_status
        `;
        
        const statsResult = await db.query(statsQuery, [userId]);
        
        const stats = {
            total_matches: 0,
            mutual_matches: 0,
            unrequited: 0
        };
        
        statsResult.rows.forEach(row => {
            stats.total_matches += parseInt(row.count);
            if (row.match_status === 'matched') {
                stats.mutual_matches = parseInt(row.count);
            } else if (row.match_status === 'unrequited') {
                stats.unrequited = parseInt(row.count);
            }
        });
        
        res.json({
            success: true,
            matches: result.rows,
            stats,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

// GET /api/notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 20, offset = 0 } = req.query;
        
        const result = await db.query(
            `SELECT id, notification_type, title, message, related_user_id, 
                    is_read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        
        const unreadCount = await db.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        );
        
        res.json({
            success: true,
            notifications: result.rows,
            unread_count: parseInt(unreadCount.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// ADMIN DASHBOARD ROUTES (HIDDEN)
// ============================================================================

const ADMIN_PATH = process.env.ADMIN_SECRET_PATH || 'admin-omkar-default';

// Serve admin page at secret URL
app.get(`/${ADMIN_PATH}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// GET /api/[SECRET]/pending
app.get(`/api/${ADMIN_PATH}/pending`, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.username, u.display_name, u.email, u.verification_type, 
                   u.college_name, u.student_id_url, u.social_link, vr.submitted_at
            FROM users u
            JOIN verification_requests vr ON u.id = vr.user_id
            WHERE u.is_identity_verified = false AND vr.status = 'pending'
            ORDER BY vr.submitted_at DESC
        `);
        res.json({ success: true, requests: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/[SECRET]/approve/:id
app.post(`/api/${ADMIN_PATH}/approve/:id`, async (req, res) => {
    try {
        const userId = req.params.id;
        await db.query('UPDATE users SET is_identity_verified = true WHERE id = $1', [userId]);
        await db.query("UPDATE verification_requests SET status = 'approved', reviewed_at = NOW() WHERE user_id = $1", [userId]);
        res.json({ success: true, message: 'User approved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/[SECRET]/reject/:id
app.post(`/api/${ADMIN_PATH}/reject/:id`, async (req, res) => {
    try {
        const userId = req.params.id;
        await db.query("UPDATE verification_requests SET status = 'rejected', reviewed_at = NOW() WHERE user_id = $1", [userId]);
        res.json({ success: true, message: 'User rejected' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'RESOURCE_NOT_FOUND',
        statusCode: 404
    });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        statusCode: err.statusCode || 500,
        timestamp: new Date().toISOString()
    });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`✓ Crush Detector API running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
});

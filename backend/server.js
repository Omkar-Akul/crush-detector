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
    const fromEmail = process.env.BREVO_FROM || process.env.BREVO_USER || process.env.EMAIL_FROM;
    const apiKey = process.env.BREVO_PASS;

    // ALWAYS log OTP to console in development for immediate access
    console.log('\n=======================================');
    console.log('🚀 [OTP SERVICE] SENDING VERIFICATION CODE');
    console.log(`📍 TO: ${email}`);
    console.log(`🔑 CODE: ${otp}`);
    console.log('=======================================\n');

    // Fallback to SMTP if Brevo API Key is missing (Common in local dev)

    if (!apiKey && process.env.EMAIL_PASS) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: process.env.EMAIL_PORT || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            await transporter.sendMail({
                from: `"CrushDetector" <${fromEmail}>`,
                to: email,
                subject: "Verify your CrushDetector account",
                html: `
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
            });
            console.log(`✓ Email sent via SMTP (Nodemailer) to ${email}`);
            return;
        } catch (smtpError) {
            console.error('❌ SMTP Fallback Error:', smtpError.message);
            // Fall through to console log if SMTP fails too
        }
    }

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
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
        `);

        // 3. Verification requests table
        await db.query(`
            CREATE TABLE IF NOT EXISTS verification_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                submitted_at TIMESTAMP DEFAULT NOW(),
                reviewed_at TIMESTAMP,
                admin_notes TEXT
            );
        `);

        // 4. Sessions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT true,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Matches table
        await db.query(`
            CREATE TABLE IF NOT EXISTS matches (
                id SERIAL PRIMARY KEY,
                user_1_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_2_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                match_status VARCHAR(20) DEFAULT 'matched',
                user_1_reaction VARCHAR(20),
                user_2_reaction VARCHAR(20),
                mutual_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_1_id, user_2_id)
            )
        `);

        // 6. Notifications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                notification_type VARCHAR(50) NOT NULL,
                title VARCHAR(255),
                message TEXT,
                related_user_id INT REFERENCES users(id) ON DELETE SET NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 7. Crush declarations table
        await db.query(`
            CREATE TABLE IF NOT EXISTS crush_declarations (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                crush_username VARCHAR(50) NOT NULL,
                crush_user_id INT REFERENCES users(id) ON DELETE CASCADE,
                confidence_level INT DEFAULT 5,
                is_anonymous BOOLEAN DEFAULT false,
                status VARCHAR(20) DEFAULT 'active',
                declared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 8. Couple Games / Streaks tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS would_you_rather (
                id SERIAL PRIMARY KEY,
                option_1 TEXT NOT NULL,
                option_2 TEXT NOT NULL
            )
        `);
        
        // Insert dummy WYR if empty
        const wyrCheck = await db.query('SELECT count(*) FROM would_you_rather');
        if (parseInt(wyrCheck.rows[0].count) === 0) {
            await db.query(`
                INSERT INTO would_you_rather (option_1, option_2) VALUES 
                ('Travel to the past', 'Travel to the future'),
                ('Live without music', 'Live without TV'),
                ('Be able to fly', 'Be invisible'),
                ('Have a pause button for life', 'Have a rewind button for life'),
                ('Always have to say everything on your mind', 'Never speak again'),
                ('Be completely alone for 5 years', 'Never be alone for 5 years'),
                ('Have unlimited free food', 'Have unlimited free flights'),
                ('Be a famous director', 'Be a famous actor'),
                ('Always be 10 minutes late', 'Always be 20 minutes early'),
                ('Win the lottery', 'Live twice as long'),
                ('Never use a smartphone again', 'Never use a computer again'),
                ('Be a genius everyone thinks is an idiot', 'Be an idiot everyone thinks is a genius'),
                ('Give up sweets forever', 'Give up spicy food forever'),
                ('Have the ability to read minds', 'Have the ability to see the future'),
                ('Only be able to whisper', 'Only be able to shout'),
                ('Have a photographic memory', 'Have an extra 50 IQ points'),
                ('Never age physically', 'Never age mentally'),
                ('Live in a treehouse', 'Live in a houseboat'),
                ('Give up social media forever', 'Give up streaming services forever'),
                ('Have an unlimited gift card to a restaurant', 'Have an unlimited gift card to a clothing store'),
                ('Be able to breathe underwater', 'Be able to talk to animals'),
                ('Have your dream job but make minimum wage', 'Have a terrible job but be a millionaire'),
                ('Never wear shoes again', 'Never wear socks again'),
                ('Only eat pizza for a year', 'Only eat tacos for a year'),
                ('Always have a full battery on your phone', 'Always have a full tank of gas'),
                ('Be an olympic gold medalist', 'Be a nobel prize winner'),
                ('Never have to clean again', 'Never have to cook again'),
                ('Have the power of teleportation', 'Have the power of telekinesis'),
                ('Be best friends with your favorite celebrity', 'Win a million dollars'),
                ('Never need to sleep', 'Never need to eat'),
                ('Have an elephant as a pet', 'Have a tiger as a pet'),
                ('Live without the internet for a week', 'Live without your best friend for a week'),
                ('Be universally loved but poor', 'Be universally hated but rich'),
                ('Never be able to lie', 'Always believe every lie you hear'),
                ('Only listen to one song for the rest of your life', 'Only watch one movie for the rest of your life'),
                ('Have a time machine', 'Have a spaceship'),
                ('Be the funniest person in the room', 'Be the smartest person in the room'),
                ('Always be cold', 'Always be hot'),
                ('Have the ability to control fire', 'Have the ability to control water'),
                ('Never have to work again', 'Work at a job you absolutely love'),
                ('Be able to change the past', 'Be able to see the future'),
                ('Have a personal chef', 'Have a personal maid'),
                ('Be an amazing singer', 'Be an amazing dancer'),
                ('Live in the mountains', 'Live on the beach'),
                ('Be famous for something silly', 'Be unknown for something important'),
                ('Always wear winter clothes in summer', 'Always wear summer clothes in winter'),
                ('Have unlimited money but you can only spend it on others', 'Have $50,000 to spend only on yourself'),
                ('Never get angry', 'Never get sad'),
                ('Be able to stop time', 'Be able to fast forward time'),
                ('Live in a haunted house', 'Live in a house with no electricity'),
                ('Be a superhero', 'Be a supervillain'),
                ('Have fingers for toes', 'Have toes for fingers'),
                ('Only eat cold food', 'Only eat hot food'),
                ('Never be able to ask a question', 'Never be able to answer a question'),
                ('Have a flying carpet', 'Have a car that can drive underwater'),
                ('Be the best player on a losing team', 'Be the worst player on a winning team'),
                ('Always have a song stuck in your head', 'Always have an itch you can''t scratch'),
                ('Be able to talk to your past self', 'Be able to talk to your future self'),
                ('Have the ability to heal others', 'Have the ability to heal yourself instantly'),
                ('Live in a world with magic', 'Live in a world with advanced sci-fi technology')
            `);
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS daily_questions (
                id SERIAL PRIMARY KEY,
                question_text TEXT NOT NULL
            )
        `);
        
        // Insert some dummy questions if empty
        const qCheck = await db.query('SELECT count(*) FROM daily_questions');
        if (parseInt(qCheck.rows[0].count) === 0) {
            await db.query(`
                INSERT INTO daily_questions (question_text) VALUES 
                ('What is your favorite memory of us?'),
                ('What is your partner''s favorite food?'),
                ('Where would you want to travel together?'),
                ('What made you smile today?'),
                ('What is a movie you both love?'),
                ('What is the best gift you have ever received?'),
                ('Describe your partner in 3 words.'),
                ('What is a weird habit you both have?'),
                ('What is your favorite thing about your partner?'),
                ('If you could relive one day with your partner, what would it be?'),
                ('What is a goal you want to achieve together?'),
                ('What is your partner''s biggest pet peeve?'),
                ('What is the funniest thing your partner has done?'),
                ('What is your partner''s favorite song right now?'),
                ('What is your favorite physical feature of your partner?'),
                ('What is a new hobby you would like to try together?'),
                ('What is your partner''s dream job?'),
                ('What is your favorite way to spend a lazy Sunday?'),
                ('What is the most romantic thing your partner has done?'),
                ('What is a secret you haven''t told your partner?'),
                ('What is your partner''s go-to comfort food?'),
                ('What is your favorite inside joke?'),
                ('What is a place you want to visit with your partner?'),
                ('What is your partner''s biggest fear?'),
                ('What is the best advice your partner has given you?'),
                ('What is a skill you want to learn together?'),
                ('What is your partner''s favorite holiday?'),
                ('What is your favorite childhood memory?'),
                ('What is a movie that always makes you cry?'),
                ('What is your partner''s spirit animal?'),
                ('What is your favorite quote about love?'),
                ('What is a book you think your partner should read?'),
                ('What is your partner''s favorite season?'),
                ('What is a risk you took that paid off?'),
                ('What is your partner''s proudest accomplishment?'),
                ('What is your favorite way to show affection?'),
                ('What is a childhood dream you still have?'),
                ('What is your partner''s favorite dessert?'),
                ('What is the best concert you have been to together?'),
                ('What is a cause you both care about?'),
                ('What is your partner''s favorite color?'),
                ('What is a tradition you want to start together?'),
                ('What is your partner''s guilty pleasure?'),
                ('What is a historical event you wish you could have witnessed?'),
                ('What is your partner''s favorite TV show?'),
                ('What is your favorite piece of clothing your partner wears?'),
                ('What is a compliment you love receiving from your partner?'),
                ('What is your partner''s favorite drink?'),
                ('What is a fear you have overcome together?'),
                ('What is your favorite memory of your first date?'),
                ('What is a challenge you want to tackle together?'),
                ('What is your partner''s favorite superhero?'),
                ('What is a lesson you learned from your partner?'),
                ('What is your favorite way to relax after a long day?'),
                ('What is a talent your partner has that you admire?'),
                ('What is your partner''s favorite board game?'),
                ('What is a milestone you are looking forward to?'),
                ('What is your favorite thing to cook together?'),
                ('What is your partner''s favorite childhood toy?'),
                ('What is a place you feel most at peace?'),
                ('What is your partner''s favorite flower?')
            `);
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS couple_streaks (
                id SERIAL PRIMARY KEY,
                match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
                current_streak INT DEFAULT 0,
                highest_streak INT DEFAULT 0,
                last_played_date DATE,
                current_question_id INT REFERENCES daily_questions(id) ON DELETE SET NULL,
                current_wyr_id INT REFERENCES would_you_rather(id) ON DELETE SET NULL,
                current_game_type VARCHAR(20) DEFAULT 'question',
                current_question_date DATE,
                UNIQUE(match_id)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS couple_answers (
                id SERIAL PRIMARY KEY,
                match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
                question_id INT NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                answer_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(match_id, question_id, user_id)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
                sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message_text TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS confessions (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                is_anonymous BOOLEAN DEFAULT true,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes safely (cannot be used with IF NOT EXISTS in all older PG versions so we try/catch or skip)
        try {
            await db.query(`CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_confessions_status ON confessions(status)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id)`);
        } catch(e) {
            // ignore index errors
        }

        // Migration: Ensure new schema fields exist
        try {
            await db.query(`
                ALTER TABLE daily_questions DROP CONSTRAINT IF EXISTS daily_questions_date_active_key;
                ALTER TABLE daily_questions DROP COLUMN IF EXISTS date_active;
                ALTER TABLE couple_streaks ADD COLUMN IF NOT EXISTS current_question_id INT REFERENCES daily_questions(id) ON DELETE SET NULL;
                ALTER TABLE couple_streaks ADD COLUMN IF NOT EXISTS current_question_date DATE;
            `);
        } catch (mErr) {
            console.log('Migration note (usually safe to ignore):', mErr.message);
        }

        // Migration: Ensure existing tables have ON DELETE CASCADE
        try {
            await db.query(`
                ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey;
                ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
                
                ALTER TABLE crush_declarations DROP CONSTRAINT IF EXISTS crush_declarations_user_id_fkey;
                ALTER TABLE crush_declarations ADD CONSTRAINT crush_declarations_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

                ALTER TABLE crush_declarations DROP CONSTRAINT IF EXISTS crush_declarations_crush_user_id_fkey;
                ALTER TABLE crush_declarations ADD CONSTRAINT crush_declarations_crush_user_id_fkey 
                    FOREIGN KEY (crush_user_id) REFERENCES users(id) ON DELETE CASCADE;
            `);
        } catch (mErr) {
            console.log('Migration note (usually safe to ignore):', mErr.message);
        }

        await db.query("UPDATE users SET role = 'admin' WHERE username = 'omkar'");

        console.log('✓ All database tables ready');
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

// Security middleware with CSP for Cloudinary
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
            "script-src": ["'self'", "'unsafe-inline'"], // Allow some inline scripts for the dashboard
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            callback(null, true);
        } else {
            // Use environment variable for production
            const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
            if (origin === allowedOrigin || origin.includes('onrender.com') || origin.includes('crush-detector')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { success: false, error: 'Too many requests from this IP, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // stricter limit for auth endpoints
    skipSuccessfulRequests: true,
    message: { success: false, error: 'Too many authentication attempts, please try again later.' }
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
const fs = require('fs');

// Cloudinary Configuration
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

let storage;

if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key') {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'crush_detector_ids',
            allowed_formats: ['jpg', 'png', 'jpeg'],
            transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
        }
    });
} else {
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const dir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            cb(null, dir);
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
}

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Serve static public files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
        const student_id_url = req.file ? (req.file.path.startsWith('http') ? req.file.path : '/uploads/' + req.file.filename) : null;
        
        // Validation
        if (!username || !email || !password || !display_name) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
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
                'active', false, 'college', null, 
                null, null, false
            ]
        );
        
        const user = result.rows[0];

        
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
        
        // Send OTP email in background (non-blocking for registration success)
        sendOTPEmail(email, otp, display_name).catch(emailError => {
            console.error('❌ Background OTP sending failed:', emailError.message);
        });
        
        console.log(`✓ Registration logic completed for ${email}. Redirection triggered.`);

        
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
        res.status(501).json({ 
            success: false, 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error during registration',
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
        res.status(500).json({ 
            success: false, 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
            `SELECT u.id, u.username, u.email, u.display_name, u.bio, u.profile_photo_url, 
                    u.date_of_birth, u.created_at, u.status, u.is_email_verified,
                    u.verification_type, u.student_id_url, u.social_link, u.college_name, u.is_identity_verified,
                    (SELECT status FROM verification_requests WHERE user_id = u.id ORDER BY submitted_at DESC LIMIT 1) as verification_status
             FROM users u WHERE u.id = $1`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/users/reapply
app.post('/api/users/reapply', authenticateToken, upload.single('student_id_photo'), async (req, res) => {
    try {
        const { verification_type, college_name, social_link } = req.body;
        const userId = req.user.userId;
        const student_id_url = req.file ? (req.file.path.startsWith('http') ? req.file.path : '/uploads/' + req.file.filename) : null;

        // Update user record
        await db.query(
            `UPDATE users SET 
                verification_type = $1, 
                college_name = $2, 
                social_link = $3, 
                student_id_url = COALESCE($4, student_id_url),
                is_identity_verified = false
             WHERE id = $5`,
            [verification_type, college_name || null, social_link || null, student_id_url, userId]
        );

        // Create new verification request
        await db.query(
            'INSERT INTO verification_requests (user_id, status, submitted_at) VALUES ($1, $2, NOW())',
            [userId, 'pending']
        );

        res.json({ success: true, message: 'Re-application submitted successfully!' });
    } catch (error) {
        console.error('Re-apply error:', error);
        res.status(500).json({ success: false, error: 'Internal server error during re-application' });
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

// POST /api/users/profile-photo
app.post('/api/users/profile-photo', authenticateToken, upload.single('profile_photo'), async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const photoUrl = req.file.path.startsWith('http') ? req.file.path : '/uploads/' + req.file.filename;

        // Update user profile photo URL in database
        const result = await db.query(
            `UPDATE users 
             SET profile_photo_url = $1
             WHERE id = $2
             RETURNING id, profile_photo_url`,
            [photoUrl, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            photo_url: result.rows[0].profile_photo_url
        });
    } catch (error) {
        console.error('Profile photo upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Error uploading profile photo'
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
            SELECT m.id, m.user_1_id, m.user_2_id, m.match_status, m.mutual_at, m.created_at,
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

// GET /api/[SECRET]/users
app.get(`/api/${ADMIN_PATH}/users`, async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, email, display_name, role, is_identity_verified, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/[SECRET]/crushes
app.get(`/api/${ADMIN_PATH}/crushes`, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT cd.id, cd.user_id, u1.username as sender, cd.crush_username as target, 
                   cd.confidence_level, cd.is_anonymous, cd.status, cd.declared_at
            FROM crush_declarations cd
            JOIN users u1 ON cd.user_id = u1.id
            ORDER BY cd.declared_at DESC
        `);
        res.json({ success: true, crushes: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/[SECRET]/matches
app.get(`/api/${ADMIN_PATH}/matches`, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.id, u1.username as user1, u2.username as user2, 
                   m.match_status, m.mutual_at, m.created_at
            FROM matches m
            JOIN users u1 ON m.user_1_id = u1.id
            JOIN users u2 ON m.user_2_id = u2.id
            ORDER BY m.created_at DESC
        `);
        res.json({ success: true, matches: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/[SECRET]/users/:id
app.delete(`/api/${ADMIN_PATH}/users/:id`, async (req, res) => {
    try {
        const userId = req.params.id;
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/[SECRET]/crushes/:id
app.delete(`/api/${ADMIN_PATH}/crushes/:id`, async (req, res) => {
    try {
        const crushId = req.params.id;
        await db.query('DELETE FROM crush_declarations WHERE id = $1', [crushId]);
        res.json({ success: true, message: 'Crush deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================================================
// ROUTES - CONFESSIONS (ANONYMOUS MESSAGES)
// ============================================================================

// GET /api/confessions - Get all approved confessions
app.get('/api/confessions', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, content, created_at 
             FROM confessions 
             WHERE status = 'approved' 
             ORDER BY created_at DESC LIMIT 50`
        );
        res.json({ success: true, confessions: result.rows });
    } catch (error) {
        console.error('Fetch confessions error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch confessions' });
    }
});

// POST /api/confessions - Submit a new confession
app.post('/api/confessions', authenticateToken, async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.user.userId;

        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Title and content are required' });
        }

        const result = await db.query(
            `INSERT INTO confessions (user_id, title, content, is_anonymous, status)
             VALUES ($1, $2, $3, true, 'pending')
             RETURNING id, title, content, created_at`,
            [userId, title, content]
        );

        res.json({ success: true, message: 'Confession submitted! Admin will review it soon.', confession: result.rows[0] });
    } catch (error) {
        console.error('Confession submission error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/admin/confessions - Admin view all confessions
app.get(`/api/${ADMIN_PATH}/confessions`, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.id, c.title, c.content, c.is_anonymous, c.status, c.created_at, u.username, u.display_name
            FROM confessions c
            LEFT JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        `);
        res.json({ success: true, confessions: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/confessions/:id/approve - Approve confession
app.post(`/api/${ADMIN_PATH}/confessions/:id/approve`, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            `UPDATE confessions SET status = 'approved', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        res.json({ success: true, message: 'Confession approved' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/confessions/:id/reject - Reject confession
app.post(`/api/${ADMIN_PATH}/confessions/:id/reject`, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            `UPDATE confessions SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        res.json({ success: true, message: 'Confession rejected' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================================================
// ROUTES - COUPLE GAMES / DAILY QUESTION
// ============================================================================

// GET /api/games/daily-question/:matchId
app.get('/api/games/daily-question/:matchId', authenticateToken, async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const userId = req.user.userId;

        // Verify user is in this match
        const matchCheck = await db.query(
            'SELECT * FROM matches WHERE id = $1 AND (user_1_id = $2 OR user_2_id = $2)',
            [matchId, userId]
        );

        if (matchCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const match = matchCheck.rows[0];
        const partnerId = match.user_1_id === userId ? match.user_2_id : match.user_1_id;

        // Ensure streak record exists
        let streakData;
        const streakResult = await db.query('SELECT * FROM couple_streaks WHERE match_id = $1', [matchId]);
        if (streakResult.rows.length === 0) {
            const newStreak = await db.query(
                'INSERT INTO couple_streaks (match_id) VALUES ($1) RETURNING *',
                [matchId]
            );
            streakData = newStreak.rows[0];
        } else {
            streakData = streakResult.rows[0];
        }

        const today = new Date().toISOString().split('T')[0];
        const assignedDate = streakData.current_question_date ? new Date(streakData.current_question_date).toISOString().split('T')[0] : null;

        let question;
        let questionId = streakData.current_question_id;

        if (assignedDate !== today || !questionId) {
            // Need to assign a new question for today
            // Find a question they haven't answered yet
            const newQuestionResult = await db.query(`
                SELECT id, question_text FROM daily_questions 
                WHERE id NOT IN (
                    SELECT question_id FROM couple_answers WHERE match_id = $1
                )
                ORDER BY RANDOM() LIMIT 1
            `, [matchId]);

            if (newQuestionResult.rows.length > 0) {
                question = newQuestionResult.rows[0];
                questionId = question.id;
                
                // Update streak table with assignment
                await db.query(
                    'UPDATE couple_streaks SET current_question_id = $1, current_question_date = CURRENT_DATE WHERE match_id = $2',
                    [questionId, matchId]
                );
            } else {
                // If they answered all questions, just pick a random one as fallback
                const fallbackResult = await db.query('SELECT id, question_text FROM daily_questions ORDER BY RANDOM() LIMIT 1');
                question = fallbackResult.rows[0];
                questionId = question.id;
                await db.query(
                    'UPDATE couple_streaks SET current_question_id = $1, current_question_date = CURRENT_DATE WHERE match_id = $2',
                    [questionId, matchId]
                );
            }
        } else {
            // Fetch the assigned question
            const qRes = await db.query('SELECT id, question_text FROM daily_questions WHERE id = $1', [questionId]);
            question = qRes.rows[0];
        }

        // Check who has answered
        const answersResult = await db.query(
            'SELECT user_id, answer_text FROM couple_answers WHERE match_id = $1 AND question_id = $2',
            [matchId, question.id]
        );

        let myAnswer = null;
        let partnerAnswerText = null;
        let partnerHasAnswered = false;

        answersResult.rows.forEach(ans => {
            if (ans.user_id === userId) {
                myAnswer = ans.answer_text;
            } else if (ans.user_id === partnerId) {
                partnerHasAnswered = true;
                partnerAnswerText = ans.answer_text;
            }
        });

        res.json({
            success: true,
            question: {
                id: question.id,
                text: question.question_text
            },
            status: {
                myAnswer,
                partnerHasAnswered,
                // Only reveal partner's answer if both have answered
                partnerAnswer: (myAnswer && partnerHasAnswered) ? partnerAnswerText : null,
                bothAnswered: !!(myAnswer && partnerHasAnswered),
                streak: streakData.current_streak || 0
            }
        });

    } catch (error) {
        console.error('Error fetching daily question:', error);
        res.status(500).json({ success: false, error: 'Could not fetch daily question' });
    }
});

// POST /api/games/daily-question/answer
app.post('/api/games/daily-question/answer', authenticateToken, async (req, res) => {
    try {
        const { matchId, questionId, answerText } = req.body;
        const userId = req.user.userId;

        // Validation
        if (!matchId || !questionId || !answerText || !answerText.trim()) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Verify match
        const matchCheck = await db.query(
            'SELECT * FROM matches WHERE id = $1 AND (user_1_id = $2 OR user_2_id = $2)',
            [matchId, userId]
        );

        if (matchCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Insert answer
        await db.query(
            `INSERT INTO couple_answers (match_id, question_id, user_id, answer_text) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (match_id, question_id, user_id) 
             DO UPDATE SET answer_text = $4`,
            [matchId, questionId, userId, answerText.trim()]
        );

        // Check if both have answered now
        const answersCount = await db.query(
            'SELECT COUNT(*) FROM couple_answers WHERE match_id = $1 AND question_id = $2',
            [matchId, questionId]
        );

        let streakUpdated = false;
        let newStreak = 0;

        if (parseInt(answersCount.rows[0].count) === 2) {
            // Both answered! Update streak
            // Ensure we don't increment multiple times for the same day (handled by last_played_date)
            const streakCheck = await db.query('SELECT current_streak, last_played_date FROM couple_streaks WHERE match_id = $1', [matchId]);
            
            if (streakCheck.rows.length === 0) {
                // First time
                await db.query(
                    'INSERT INTO couple_streaks (match_id, current_streak, highest_streak, last_played_date) VALUES ($1, 1, 1, CURRENT_DATE)',
                    [matchId]
                );
                streakUpdated = true;
                newStreak = 1;
            } else {
                const streakData = streakCheck.rows[0];
                // Only increment if last_played_date is not today
                const today = new Date().toISOString().split('T')[0];
                const lastPlayed = streakData.last_played_date ? new Date(streakData.last_played_date).toISOString().split('T')[0] : null;

                if (lastPlayed !== today) {
                    const currentStreak = streakData.current_streak + 1;
                    const highestStreak = Math.max(currentStreak, streakCheck.rows[0].highest_streak || 0);
                    
                    await db.query(
                        'UPDATE couple_streaks SET current_streak = $1, highest_streak = $2, last_played_date = CURRENT_DATE WHERE match_id = $3',
                        [currentStreak, highestStreak, matchId]
                    );
                    streakUpdated = true;
                    newStreak = currentStreak;
                } else {
                    newStreak = streakData.current_streak;
                }
            }
        }

        res.json({ success: true, message: 'Answer submitted successfully', streakUpdated, streak: newStreak });

    } catch (error) {
        console.error('Error submitting answer:', error);
        res.status(500).json({ success: false, error: 'Could not submit answer' });
    }
});


// ============================================================================
// ROUTES - MESSAGES (CHAT)
// ============================================================================

app.get('/api/matches/:id/messages', authenticateToken, async (req, res) => {
    try {
        const matchId = req.params.id;
        const userId = req.user.userId;

        const matchCheck = await db.query(
            'SELECT * FROM matches WHERE id = $1 AND (user_1_id = $2 OR user_2_id = $2)',
            [matchId, userId]
        );

        if (matchCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const result = await db.query(
            'SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC',
            [matchId]
        );

        res.json({ success: true, messages: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Could not fetch messages' });
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

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
                callback(null, true);
            } else {
                const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
                if (origin === allowedOrigin || origin.includes('onrender.com') || origin.includes('crush-detector')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            }
        },
        credentials: true
    }
});

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: No token provided"));
    
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_change_in_production', (err, decoded) => {
        if (err) return next(new Error("Authentication error: Invalid token"));
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    socket.on('join_match', (matchId) => {
        socket.join('match_' + matchId);
    });
    socket.on('leave_match', (matchId) => {
        socket.leave('match_' + matchId);
    });

    socket.on('send_message', async (data) => {
        const { matchId, receiverId, messageText } = data;
        const senderId = socket.user.userId;
        try {
            const result = await db.query(
                "INSERT INTO messages (match_id, sender_id, receiver_id, message_text) VALUES ($1, $2, $3, $4) RETURNING *",
                [matchId, senderId, receiverId, messageText]
            );
            io.to('match_' + matchId).emit('receive_message', result.rows[0]);
        } catch (error) {
            console.error('Socket send_message error:', error);
            socket.emit('message_error', { error: 'Could not send message' });
        }
    });
});

server.listen(PORT, () => {
    console.log(`✓ Crush Detector API running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
});

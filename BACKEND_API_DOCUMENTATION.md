================================================================================
MUTUAL CRUSH DETECTOR - BACKEND API DOCUMENTATION
================================================================================
Tech Stack: Node.js + Express + PostgreSQL + JWT Authentication
================================================================================

TABLE OF CONTENTS
1. Architecture Overview
2. Environment Setup
3. Database Connection
4. Authentication System
5. API Endpoints
6. Error Handling
7. Security Considerations
8. Deployment Notes

================================================================================
1. ARCHITECTURE OVERVIEW
================================================================================

Request Flow:
Client (React) → Express Server → PostgreSQL Database
                   ↓
            Authentication Middleware (JWT)
                   ↓
            Route Handlers / Controllers
                   ↓
            Database Queries
                   ↓
            Response

Project Structure:
```
backend/
├── config/
│   ├── database.js          # PostgreSQL connection
│   ├── environment.js       # Env variables
│   └── constants.js         # App constants
├── middleware/
│   ├── auth.js              # JWT verification
│   ├── errorHandler.js      # Global error handling
│   ├── validation.js        # Input validation
│   └── rateLimiter.js       # Rate limiting
├── controllers/
│   ├── authController.js    # Auth logic
│   ├── userController.js    # User profile management
│   ├── crushController.js   # Crush declaration logic
│   ├── matchController.js   # Match results
│   └── notificationController.js
├── services/
│   ├── userService.js       # User business logic
│   ├── crushService.js      # Crush matching logic
│   ├── matchService.js      # Match operations
│   └── emailService.js      # Email notifications
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── crushRoutes.js
│   └── matchRoutes.js
├── utils/
│   ├── passwordUtils.js     # Password hashing
│   ├── jwtUtils.js          # JWT token generation
│   ├── emailTemplate.js     # Email templates
│   └── validators.js        # Validation rules
├── tests/
│   ├── auth.test.js
│   └── crush.test.js
├── server.js                # Entry point
└── package.json
```

================================================================================
2. ENVIRONMENT SETUP
================================================================================

.env file:
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crush_detector_db
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL=postgresql://postgres:password@localhost:5432/crush_detector_db

# Server
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=refresh_secret_key
REFRESH_TOKEN_EXPIRY=30d

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SENDER_EMAIL=noreply@crushdetector.com

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=15*60*1000

# Frontend
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880  # 5MB
UPLOAD_DIR=./uploads/profiles
```

Install Dependencies:
```bash
npm install express pg bcryptjs jsonwebtoken cors dotenv multer joi express-async-errors helmet express-rate-limit

npm install --save-dev nodemon jest supertest
```

================================================================================
3. DATABASE CONNECTION
================================================================================

config/database.js:
```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
};
```

================================================================================
4. AUTHENTICATION SYSTEM
================================================================================

JWT Token Structure:
```
Header: { alg: "HS256", typ: "JWT" }
Payload: { 
    userId: 1,
    username: "john_doe",
    email: "john@example.com",
    iat: 1234567890,
    exp: 1234571490  // 1 hour later
}
Signature: HMAC-SHA256(header + payload, secret)
```

middleware/auth.js:
```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) return res.status(401).json({ error: 'Access token required' });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        
        req.user = user;
        next();
    });
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
        });
    }
    
    next();
};

module.exports = { authenticateToken, optionalAuth };
```

Password Hashing (bcrypt):
```javascript
const bcrypt = require('bcryptjs');

// Hash password before storing
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
    return bcrypt.hash(password, salt);
};

// Verify password during login
const verifyPassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};
```

================================================================================
5. API ENDPOINTS
================================================================================

================================================================================
A. AUTHENTICATION ENDPOINTS
================================================================================

1. POST /api/auth/register
   Purpose: Create a new user account
   
   Request Body:
   {
       "username": "john_doe",
       "email": "john@example.com",
       "password": "secure_password_123",
       "display_name": "John Doe",
       "date_of_birth": "1995-05-15"
   }
   
   Response (201):
   {
       "success": true,
       "message": "User registered successfully",
       "user": {
           "id": 1,
           "username": "john_doe",
           "email": "john@example.com",
           "display_name": "John Doe"
       },
       "tokens": {
           "accessToken": "eyJhbGciOiJIUzI1NiIs...",
           "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
       }
   }
   
   Error (400):
   {
       "success": false,
       "error": "Username already exists"
   }
   
   Validation:
   - Username: 3-50 chars, alphanumeric + underscore
   - Email: valid email format
   - Password: min 8 chars, uppercase, lowercase, number
   - Display name: 2-100 chars
   
   Database Operations:
   - INSERT INTO users (username, email, password_hash, display_name, ...)
   - INSERT INTO sessions (user_id, token, ...)

---

2. POST /api/auth/login
   Purpose: Authenticate user and get JWT tokens
   
   Request Body:
   {
       "username": "john_doe",
       "password": "secure_password_123"
   }
   
   Response (200):
   {
       "success": true,
       "user": {
           "id": 1,
           "username": "john_doe",
           "display_name": "John Doe",
           "profile_photo_url": "..."
       },
       "tokens": {
           "accessToken": "eyJhbGciOiJIUzI1NiIs...",
           "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
       }
   }
   
   Error (401):
   {
       "success": false,
       "error": "Invalid username or password"
   }
   
   Database Operations:
   - SELECT * FROM users WHERE username = $1
   - Verify password_hash with bcrypt
   - UPDATE users SET last_login = NOW() WHERE id = $1
   - INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)

---

3. POST /api/auth/refresh-token
   Purpose: Get new access token using refresh token
   
   Headers:
   Authorization: Bearer {refreshToken}
   
   Response (200):
   {
       "success": true,
       "accessToken": "eyJhbGciOiJIUzI1NiIs..."
   }
   
   Error (401):
   {
       "success": false,
       "error": "Refresh token expired"
   }

---

4. POST /api/auth/logout
   Purpose: Logout user and invalidate session
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Response (200):
   {
       "success": true,
       "message": "Logged out successfully"
   }
   
   Database Operations:
   - UPDATE sessions SET is_active = false WHERE token = $1

---

5. POST /api/auth/verify-email
   Purpose: Verify email after registration
   
   Request Body:
   {
       "token": "email_verification_token_sent_to_email"
   }
   
   Response (200):
   {
       "success": true,
       "message": "Email verified successfully"
   }

================================================================================
B. USER PROFILE ENDPOINTS
================================================================================

1. GET /api/users/:username
   Purpose: Get user profile by username
   
   Headers:
   Authorization: Bearer {accessToken} (optional)
   
   Response (200):
   {
       "success": true,
       "user": {
           "id": 1,
           "username": "john_doe",
           "display_name": "John Doe",
           "bio": "Love hiking and coding",
           "profile_photo_url": "https://...",
           "date_of_birth": "1995-05-15",
           "created_at": "2024-01-15T10:30:00Z",
           "profile_completion_percentage": 75
       },
       "stats": {
           "crush_count": 1,
           "match_count": 1,
           "profile_views": 42
       }
   }
   
   Error (404):
   {
       "success": false,
       "error": "User not found"
   }
   
   Database Operations:
   - SELECT * FROM users WHERE username = $1 AND status = 'active'
   - SELECT COUNT(*) FROM crush_declarations WHERE user_id = $1
   - SELECT COUNT(*) FROM matches WHERE (user_1_id = $1 OR user_2_id = $1) AND match_status = 'matched'

---

2. PUT /api/users/profile
   Purpose: Update own profile
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Request Body:
   {
       "display_name": "John Doe",
       "bio": "Updated bio",
       "date_of_birth": "1995-05-15",
       "profile_photo_url": "https://..."
   }
   
   Response (200):
   {
       "success": true,
       "user": { ...updated user object... }
   }
   
   Database Operations:
   - UPDATE users SET display_name = $1, bio = $2, ... WHERE id = $3
   - Recalculate profile_completion_percentage

---

3. POST /api/users/upload-profile-photo
   Purpose: Upload profile photo
   
   Headers:
   Authorization: Bearer {accessToken}
   Content-Type: multipart/form-data
   
   Form Data:
   photo: [image file, max 5MB]
   
   Response (200):
   {
       "success": true,
       "photo_url": "https://..."
   }
   
   File Handling:
   - Store in /uploads/profiles/{userId}/{timestamp}.jpg
   - Return public URL
   - Update user profile_photo_url

---

4. GET /api/users/:userId/matches
   Purpose: Get all matches for a user
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Query Parameters:
   status: matched | unrequited | pending
   limit: 10
   offset: 0
   
   Response (200):
   {
       "success": true,
       "matches": [
           {
               "id": 1,
               "matched_user": {
                   "id": 2,
                   "username": "jane_doe",
                   "display_name": "Jane Doe",
                   "profile_photo_url": "..."
               },
               "match_status": "matched",
               "mutual_at": "2024-01-20T14:30:00Z",
               "created_at": "2024-01-20T14:30:00Z"
           }
       ],
       "total": 5,
       "limit": 10,
       "offset": 0
   }
   
   Database Operations:
   - SELECT * FROM matches WHERE (user_1_id = $1 OR user_2_id = $1)
   - JOIN with users to get matched user details
   - ORDER BY created_at DESC
   - LIMIT and OFFSET for pagination

---

5. GET /api/users/me
   Purpose: Get current authenticated user's profile
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Response (200):
   {
       "success": true,
       "user": { ...current user object... }
   }

================================================================================
C. CRUSH DECLARATION ENDPOINTS
================================================================================

1. POST /api/crushes/declare
   Purpose: Declare a crush on someone
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Request Body:
   {
       "crush_username": "jane_doe",
       "confidence_level": 8,
       "is_anonymous": false,
       "notes": "She's amazing"
   }
   
   Response (201):
   {
       "success": true,
       "message": "Crush declared successfully",
       "crush": {
           "id": 1,
           "crush_username": "jane_doe",
           "crush_user_id": 2,
           "confidence_level": 8,
           "status": "pending_mutual_check",
           "declared_at": "2024-01-20T14:30:00Z"
       }
   }
   
   Error (400):
   {
       "success": false,
       "error": "Cannot declare crush on yourself"
   }
   
   Error (409):
   {
       "success": false,
       "error": "You already declared a crush on this person"
   }
   
   Validation:
   - crush_username exists in database
   - user_id != crush_user_id
   - confidence_level: 1-10
   - Check for duplicate declarations
   
   Database Operations:
   - Check if crush_username exists: SELECT id FROM users WHERE username = $1
   - INSERT INTO crush_declarations (user_id, crush_username, crush_user_id, ...)
   - TRIGGER: Automatically check if mutual crush exists
   - If mutual: CREATE/UPDATE match in matches table
   - INSERT INTO notifications if mutual match is found

---

2. POST /api/crushes/search
   Purpose: Search for users to declare crush on
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Query Parameters:
   q: "jane"
   limit: 10
   offset: 0
   
   Response (200):
   {
       "success": true,
       "results": [
           {
               "id": 2,
               "username": "jane_doe",
               "display_name": "Jane Doe",
               "profile_photo_url": "...",
               "bio": "Love coffee",
               "has_crush_on_you": true/false,
               "you_have_crush_on_them": false
           }
       ],
       "total": 5
   }
   
   Database Operations:
   - SELECT * FROM users WHERE (username ILIKE $1 OR display_name ILIKE $1) AND status = 'active'
   - LEFT JOIN crush_declarations to check both directions
   - Filter out current user and deleted accounts

---

3. GET /api/crushes/my-crushes
   Purpose: Get list of crushes declared by current user
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Response (200):
   {
       "success": true,
       "crushes": [
           {
               "id": 1,
               "crush_username": "jane_doe",
               "crush": {
                   "id": 2,
                   "display_name": "Jane Doe",
                   "profile_photo_url": "..."
               },
               "confidence_level": 8,
               "declared_at": "2024-01-20T14:30:00Z",
               "mutual_status": "unrequited" // mutual, unrequited, not_found
           }
       ]
   }
   
   Database Operations:
   - SELECT * FROM crush_declarations WHERE user_id = $1 AND status = 'active'
   - LEFT JOIN users to get crush details
   - LEFT JOIN matches to check if mutual

---

4. GET /api/crushes/crushing-on-me
   Purpose: Get list of people who have crush on current user
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Response (200):
   {
       "success": true,
       "crushes": [
           {
               "id": 1,
               "admirer": {
                   "id": 3,
                   "username": "bob_smith",
                   "display_name": "Bob Smith",
                   "profile_photo_url": "..."
               },
               "is_anonymous": false,
               "confidence_level": 7,
               "declared_at": "2024-01-19T10:00:00Z",
               "mutual_status": "matched" // matched, not_mutual, anonymous
           }
       ]
   }
   
   Validation:
   - Only show non-anonymous crushes
   - If anonymous: show "Someone has a crush on you"
   
   Database Operations:
   - SELECT * FROM crush_declarations WHERE crush_user_id = $1 AND is_anonymous = false
   - LEFT JOIN users to get admirer details
   - LEFT JOIN matches to check if mutual

---

5. DELETE /api/crushes/:crushId
   Purpose: Remove a crush declaration
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Response (200):
   {
       "success": true,
       "message": "Crush removed"
   }
   
   Database Operations:
   - UPDATE crush_declarations SET status = 'deleted' WHERE id = $1 AND user_id = $2
   - Check if related match should be updated

---

6. PUT /api/crushes/:crushId
   Purpose: Update a crush declaration
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Request Body:
   {
       "confidence_level": 9,
       "notes": "Updated notes"
   }
   
   Response (200):
   {
       "success": true,
       "crush": { ...updated crush object... }
   }

================================================================================
D. MATCH ENDPOINTS
================================================================================

1. GET /api/matches
   Purpose: Get all matches for current user
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Query Parameters:
   status: matched | unrequited | all
   sort: newest | oldest | mutual_at
   limit: 10
   offset: 0
   
   Response (200):
   {
       "success": true,
       "matches": [
           {
               "id": 1,
               "other_user": {
                   "id": 2,
                   "username": "jane_doe",
                   "display_name": "Jane Doe",
                   "profile_photo_url": "...",
                   "bio": "Love hiking"
               },
               "match_status": "matched",
               "mutual_at": "2024-01-20T14:30:00Z",
               "created_at": "2024-01-20T14:30:00Z",
               "user_1_reaction": "happy",
               "user_2_reaction": null
           }
       ],
       "stats": {
           "total_matches": 3,
           "mutual_matches": 2,
           "unrequited": 1
       }
   }
   
   Database Operations:
   - SELECT * FROM matches WHERE (user_1_id = $1 OR user_2_id = $1)
   - JOIN users for matched user details
   - ORDER BY based on sort parameter
   - COUNT aggregate functions for stats

---

2. GET /api/matches/:matchId
   Purpose: Get details of a specific match
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Response (200):
   {
       "success": true,
       "match": {
           "id": 1,
           "user_1": { ...user details... },
           "user_2": { ...user details... },
           "match_status": "matched",
           "mutual_at": "2024-01-20T14:30:00Z",
           "created_at": "2024-01-20T14:30:00Z",
           "is_private": false,
           "user_1_reaction": "happy",
           "user_2_reaction": "excited",
           "initial_message": "Hi! We matched!"
       }
   }

---

3. POST /api/matches/:matchId/react
   Purpose: React to a match (happy, excited, surprised, etc.)
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Request Body:
   {
       "reaction": "happy"  // happy, excited, surprised, blessed
   }
   
   Response (200):
   {
       "success": true,
       "match": { ...updated match... }
   }
   
   Database Operations:
   - UPDATE matches SET user_1_reaction = $1 WHERE id = $2 AND user_1_id = $3
   - INSERT INTO match_history for tracking

---

4. POST /api/matches/:matchId/message
   Purpose: Send initial message in a match
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Request Body:
   {
       "message": "Hey! I'm so excited we matched!"
   }
   
   Response (200):
   {
       "success": true,
       "message": "Message sent",
       "match": { ...updated match... }
   }
   
   Database Operations:
   - UPDATE matches SET initial_message = $1 WHERE id = $2
   - INSERT INTO notifications to notify other user

---

5. POST /api/matches/:matchId/reveal
   Purpose: Reveal/make a match public
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Request Body:
   {
       "is_private": false
   }
   
   Response (200):
   {
       "success": true,
       "match": { ...updated match... }
   }
   
   Database Operations:
   - Both users must agree to reveal before publicizing
   - UPDATE matches SET is_private = $1 WHERE id = $2
   - Notify other user of change

================================================================================
E. NOTIFICATION ENDPOINTS
================================================================================

1. GET /api/notifications
   Purpose: Get unread notifications
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Query Parameters:
   limit: 20
   offset: 0
   
   Response (200):
   {
       "success": true,
       "notifications": [
           {
               "id": 1,
               "type": "match",
               "title": "You matched with Jane!",
               "message": "You both have a crush on each other!",
               "related_user": { ...user object... },
               "related_match_id": 5,
               "created_at": "2024-01-20T14:30:00Z",
               "is_read": false
           }
       ],
       "unread_count": 3
   }
   
   Database Operations:
   - SELECT * FROM notifications WHERE user_id = $1 AND is_read = false
   - ORDER BY created_at DESC
   - LIMIT and OFFSET

---

2. PUT /api/notifications/:notificationId/read
   Purpose: Mark notification as read
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Response (200):
   {
       "success": true,
       "notification": { ...notification... }
   }
   
   Database Operations:
   - UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1

---

3. PUT /api/notifications/read-all
   Purpose: Mark all notifications as read
   
   Headers:
   Authorization: Bearer {accessToken}
   
   Response (200):
   {
       "success": true,
       "message": "All notifications marked as read"
   }
   
   Database Operations:
   - UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false

================================================================================
6. ERROR HANDLING
================================================================================

Standardized Error Response Format:
```javascript
{
    "success": false,
    "error": "Error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2024-01-20T14:30:00Z",
    "details": {} // Optional additional info
}
```

HTTP Status Codes:
- 200: OK (successful GET, PUT, DELETE)
- 201: Created (successful POST creating resource)
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid auth)
- 403: Forbidden (authenticated but no permission)
- 404: Not Found (resource doesn't exist)
- 409: Conflict (duplicate entry, constraint violation)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error
- 503: Service Unavailable

Error Codes:
- VALIDATION_ERROR
- AUTHENTICATION_ERROR
- AUTHORIZATION_ERROR
- RESOURCE_NOT_FOUND
- DUPLICATE_ENTRY
- RATE_LIMIT_EXCEEDED
- DATABASE_ERROR
- FILE_UPLOAD_ERROR

Middleware for Error Handling:
```javascript
const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const code = err.code || 'INTERNAL_ERROR';
    
    res.status(status).json({
        success: false,
        error: message,
        code: code,
        statusCode: status,
        timestamp: new Date().toISOString()
    });
};

app.use(errorHandler);
```

================================================================================
7. SECURITY CONSIDERATIONS
================================================================================

1. Password Security:
   - Hash with bcrypt (min 10 rounds)
   - Never return password in responses
   - Require strong password: min 8 chars, uppercase, lowercase, number, special char

2. JWT Security:
   - Store JWT_SECRET in environment variables
   - Use HTTPS only in production
   - Access token: 1 hour expiry
   - Refresh token: 30 days expiry
   - Implement token blacklist for logout

3. SQL Injection Prevention:
   - Use parameterized queries (pg library handles this)
   - Example: db.query("SELECT * FROM users WHERE id = $1", [id])
   - Never concatenate user input into SQL

4. CORS Configuration:
   ```javascript
   const cors = require('cors');
   app.use(cors({
       origin: process.env.CORS_ORIGIN,
       credentials: true,
       methods: ['GET', 'POST', 'PUT', 'DELETE'],
       allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

5. Rate Limiting:
   ```javascript
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 minutes
       max: 100, // limit each IP to 100 requests per windowMs
       message: 'Too many requests'
   });
   app.use(limiter);
   ```

6. Helmet.js for HTTP Headers:
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

7. Input Validation:
   - Use Joi for schema validation
   - Validate all user inputs
   - Sanitize strings

8. Authentication Checks:
   - Every protected route must check authenticateToken middleware
   - Verify user owns the resource they're accessing
   - Example: Ensure user_id from token matches requested user_id

9. Data Encryption:
   - Passwords: bcrypt (one-way hashing)
   - Sensitive emails/data: Consider AES-256 for highly sensitive info
   - Tokens: JWT with HMAC-SHA256

10. HTTPS Only:
    - Set secure: true on session cookies
    - Implement HSTS (HTTP Strict-Transport-Security)
    - Redirect HTTP to HTTPS

11. User Privacy:
    - Allow anonymous crush declarations
    - Don't show who has crush on you unless they allow it
    - GDPR compliance for data deletion

================================================================================
8. DEPLOYMENT NOTES
================================================================================

Development:
```bash
npm install
npm start  # runs nodemon for auto-reload
```

Production:
```bash
NODE_ENV=production npm start
# Use PM2 for process management
pm2 start server.js --name "crush-detector"
pm2 save
```

Database Deployment:
```bash
# Connect to PostgreSQL
psql -U postgres -d crush_detector_db

# Run migrations
psql -U postgres -d crush_detector_db -f DATABASE_SCHEMA.sql

# Check if tables are created
\dt
```

API Testing:
```bash
# Run tests
npm test

# Use Postman or curl for manual testing
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test@123","display_name":"Test"}'
```

Scaling Considerations:
- Use connection pooling with pg (default 10 connections)
- Implement Redis caching for frequent queries
- Use database indexes (already in schema)
- Implement pagination for large result sets
- Consider read replicas for analytics queries

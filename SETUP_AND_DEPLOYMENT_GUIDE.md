================================================================================
MUTUAL CRUSH DETECTOR - COMPLETE SETUP & DEPLOYMENT GUIDE
================================================================================

This guide provides step-by-step instructions to set up and deploy the 
Mutual Crush Detector application both locally and in production.

================================================================================
TABLE OF CONTENTS
================================================================================

1. Prerequisites
2. Local Development Setup
3. Database Setup
4. Backend Configuration
5. Frontend Configuration
6. Running the Application
7. Testing the API
8. Production Deployment
9. Troubleshooting
10. Database Backup & Recovery

================================================================================
1. PREREQUISITES
================================================================================

Required Software:
- Node.js v18+ (https://nodejs.org)
- npm or yarn package manager
- PostgreSQL 12+ (https://www.postgresql.org/download)
- Git (https://git-scm.com)
- A code editor (VS Code recommended)

System Requirements:
- At least 2GB RAM for development
- At least 10GB free disk space
- Linux/macOS/Windows (any modern OS)

================================================================================
2. LOCAL DEVELOPMENT SETUP
================================================================================

Step 2.1: Clone the Repository
```bash
git clone <repository-url>
cd crush-detector
```

Step 2.2: Install Backend Dependencies
```bash
cd backend
npm install
```

This will install:
- express (web framework)
- pg (PostgreSQL client)
- bcryptjs (password hashing)
- jsonwebtoken (JWT tokens)
- cors (cross-origin requests)
- dotenv (environment variables)
- helmet (security headers)
- express-rate-limit (rate limiting)

Step 2.3: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

This will install:
- react (UI library)
- react-dom (DOM binding)
- react-router-dom (routing)
- axios (HTTP client)

Step 2.4: Verify Installations
```bash
node --version    # Should be v18+
npm --version     # Should be 8+
psql --version    # Should be 12+
```

================================================================================
3. DATABASE SETUP
================================================================================

Step 3.1: Create PostgreSQL Database

On Linux/macOS:
```bash
# Login to PostgreSQL
sudo -u postgres psql

# In the psql prompt:
CREATE DATABASE crush_detector_db;
CREATE USER crush_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE crush_detector_db TO crush_user;
\q
```

On Windows (using PostgreSQL GUI):
- Open pgAdmin
- Right-click "Databases" → "Create" → "Database"
- Name: crush_detector_db
- Right-click "Login/Group Roles" → "Create" → "Login/Group Role"
- Name: crush_user
- Password: secure_password_here
- In Privileges tab, check all boxes

Step 3.2: Import Database Schema

```bash
# From the project root directory
psql -U crush_user -d crush_detector_db -f DATABASE_SCHEMA.sql

# You will be prompted for the password:
# Enter: secure_password_here

# Verify tables are created:
psql -U crush_user -d crush_detector_db
\dt  # List all tables
\q   # Exit
```

Step 3.3: Verify Database Tables

Tables that should exist:
- users
- crush_declarations
- matches
- match_history
- notifications
- sessions
- profile_views

```bash
psql -U crush_user -d crush_detector_db -c "\dt"
```

================================================================================
4. BACKEND CONFIGURATION
================================================================================

Step 4.1: Create Backend Environment File

Create `backend/.env`:
```
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crush_detector_db
DB_USER=crush_user
DB_PASSWORD=secure_password_here
DATABASE_URL=postgresql://crush_user:secure_password_here@localhost:5432/crush_detector_db

# Server Configuration
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000

# JWT Secrets (Change these in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
JWT_EXPIRY=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret_change_in_production_67890
REFRESH_TOKEN_EXPIRY=30d

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SENDER_EMAIL=noreply@crushdetector.com

# Security Settings
BCRYPT_ROUNDS=10
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Frontend CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads/profiles
```

Step 4.2: Generate Secure JWT Secrets

```bash
# Generate a random secret (run this in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Use the output to replace JWT_SECRET and REFRESH_TOKEN_SECRET
```

Step 4.3: Create Uploads Directory

```bash
cd backend
mkdir -p uploads/profiles
chmod 755 uploads/profiles
```

Step 4.4: Install Additional Backend Dependencies (if needed)

```bash
npm install multer joi express-async-errors uuid
```

================================================================================
5. FRONTEND CONFIGURATION
================================================================================

Step 5.1: Create Frontend Environment File

Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

Step 5.2: Update React Configuration

Create `frontend/.env.production`:
```
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENV=production
```

Step 5.3: Verify Frontend Structure

The frontend should have this structure:
```
frontend/
├── src/
│   ├── App.jsx          (main component)
│   ├── App.css          (styles)
│   ├── index.js
│   └── ...
├── public/
│   ├── index.html
│   └── ...
├── package.json
└── .env
```

================================================================================
6. RUNNING THE APPLICATION
================================================================================

Step 6.1: Start Backend Server

```bash
cd backend
npm start

# Expected output:
# ✓ Crush Detector API running on port 5000
# ✓ Environment: development
# ✓ API URL: http://localhost:5000
```

Step 6.2: Start Frontend Development Server

In a new terminal:
```bash
cd frontend
npm start

# This will automatically open http://localhost:3000 in your browser
```

Step 6.3: Test the Application

1. Open http://localhost:3000 in your browser
2. Register a new account
3. Log in
4. Try:
   - Updating your profile
   - Searching for users
   - Declaring a crush
   - Viewing matches

Step 6.4: Stop the Application

Press `Ctrl+C` in both terminals to stop the servers.

================================================================================
7. TESTING THE API
================================================================================

Step 7.1: Test with cURL

Test Registration:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@example.com",
    "password":"TestPass123",
    "display_name":"Test User"
  }'
```

Test Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "password":"TestPass123"
  }'
```

Test Protected Endpoint (get current user):
```bash
# Replace TOKEN with the accessToken from login response
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer TOKEN"
```

Step 7.2: Test with Postman

1. Download Postman (https://www.postman.com)
2. Create a new workspace for Crush Detector
3. Set up environment variables:
   - base_url: http://localhost:5000
   - token: (empty, will be filled after login)
4. Create requests for each endpoint
5. Save the collection for future use

Sample Postman Collection Structure:
```
Crush Detector API
├── Auth
│   ├── Register
│   ├── Login
│   ├── Refresh Token
│   └── Logout
├── Users
│   ├── Get Me
│   ├── Get User Profile
│   └── Update Profile
├── Crushes
│   ├── Declare Crush
│   ├── Search Users
│   ├── My Crushes
│   └── Crushing On Me
└── Matches
    ├── Get All Matches
    └── Get Match Details
```

Step 7.3: Using API with JavaScript/Fetch

```javascript
// Example: Register
async function register() {
    const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'testuser',
            email: 'test@example.com',
            password: 'TestPass123',
            display_name: 'Test User'
        })
    });
    const data = await response.json();
    console.log(data);
}

// Example: Login and use token
async function login() {
    const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'testuser',
            password: 'TestPass123'
        })
    });
    const data = await response.json();
    localStorage.setItem('accessToken', data.tokens.accessToken);
    return data.tokens.accessToken;
}

// Example: Get current user
async function getMe(token) {
    const response = await fetch('http://localhost:5000/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    console.log(data);
}
```

================================================================================
8. PRODUCTION DEPLOYMENT
================================================================================

Step 8.1: Prepare for Production

1. Update all environment variables:
   - Change JWT_SECRET and REFRESH_TOKEN_SECRET
   - Set NODE_ENV=production
   - Update CORS_ORIGIN to your domain
   - Update REACT_APP_API_URL to production API URL

2. Build the frontend:
   ```bash
   cd frontend
   npm run build
   
   # This creates a 'build' directory with optimized code
   ```

3. Serve frontend from backend (optional):
   ```bash
   # Copy build to backend public folder
   cp -r frontend/build backend/public
   
   # Update server.js to serve static files
   app.use(express.static(path.join(__dirname, 'public')));
   ```

Step 8.2: Deploy Backend to Heroku

```bash
# Install Heroku CLI
curl https://cli.heroku.com/install.sh | sh

# Login to Heroku
heroku login

# Create a new app
heroku create crush-detector-api

# Add PostgreSQL add-on
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your_production_secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

Step 8.3: Deploy Backend to AWS EC2

```bash
# 1. Launch EC2 instance
# - Choose Ubuntu 20.04 LTS
# - Choose instance type: t3.small or larger
# - Add security group: Allow HTTP (80), HTTPS (443), SSH (22)

# 2. SSH into the instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Install dependencies
sudo apt update
sudo apt install nodejs npm postgresql-client git nginx

# 4. Clone repository
git clone your-repo-url
cd crush-detector

# 5. Install and build
cd backend
npm install
cd ../frontend
npm install
npm run build

# 6. Start backend with PM2
npm install -g pm2
pm2 start backend/server.js --name "crush-detector"
pm2 startup
pm2 save

# 7. Configure Nginx as reverse proxy
# Edit /etc/nginx/sites-available/default
# Add:
upstream crush_detector {
    server localhost:5000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://crush_detector;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 8. Restart Nginx
sudo systemctl restart nginx

# 9. Set up SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Step 8.4: Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd frontend
vercel

# For production
vercel --prod
```

Step 8.5: Deploy Frontend to Netlify

1. Go to https://app.netlify.com
2. Click "New site from Git"
3. Choose your repository
4. Build command: `npm run build`
5. Publish directory: `build`
6. Add environment variables
7. Deploy

Step 8.6: Set Up Custom Domain

After deployment, add your custom domain:
- Update DNS records
- Set up SSL/TLS certificate
- Configure CORS to allow your domain

================================================================================
9. TROUBLESHOOTING
================================================================================

Issue: "Cannot connect to PostgreSQL"

Solution:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql

# Test connection
psql -U crush_user -d crush_detector_db -c "SELECT 1"
```

Issue: "CORS Error" in browser

Solution:
1. Check CORS_ORIGIN in .env
2. Verify frontend URL matches CORS_ORIGIN
3. Clear browser cache
4. Restart backend server

Issue: "JWT token is invalid"

Solution:
1. Ensure JWT_SECRET is same in all backend instances
2. Clear localStorage in browser
3. Re-login to get fresh token

Issue: "Database migration failed"

Solution:
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE crush_detector_db"
psql -U postgres -c "CREATE DATABASE crush_detector_db"

# Re-import schema
psql -U crush_user -d crush_detector_db -f DATABASE_SCHEMA.sql
```

Issue: "Port already in use"

Solution:
```bash
# Find process using port
lsof -i :5000    # For Linux/macOS
netstat -ano | findstr :5000  # For Windows

# Kill the process
kill -9 PID  # Linux/macOS
taskkill /PID PID /F  # Windows
```

Issue: "npm install fails"

Solution:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

================================================================================
10. DATABASE BACKUP & RECOVERY
================================================================================

Step 10.1: Backup Database

```bash
# Full database backup
pg_dump -U crush_user -d crush_detector_db -f backup.sql

# Compressed backup
pg_dump -U crush_user -d crush_detector_db | gzip > backup.sql.gz

# With timestamp
pg_dump -U crush_user -d crush_detector_db > backup-$(date +%Y%m%d-%H%M%S).sql
```

Step 10.2: Schedule Regular Backups

Create a backup script (backup.sh):
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/crush-detector"
DB_NAME="crush_detector_db"
DB_USER="crush_user"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/backup-$TIMESTAMP.sql.gz"

# Keep only last 7 backups
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
```

Add to crontab:
```bash
# Edit crontab
crontab -e

# Add line (backup daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

Step 10.3: Restore Database

```bash
# From SQL file
psql -U crush_user -d crush_detector_db < backup.sql

# From compressed backup
gunzip -c backup.sql.gz | psql -U crush_user -d crush_detector_db

# Verify restore
psql -U crush_user -d crush_detector_db -c "SELECT COUNT(*) FROM users"
```

Step 10.4: Backup Strategy

- **Daily backups** for production
- **Weekly full exports** to separate storage
- **Monthly snapshots** to cloud storage (S3, GCS)
- **Test restores** monthly
- **Keep 30 days** of backups minimum

Cloud Backup Example (AWS S3):
```bash
#!/bin/bash
pg_dump -U crush_user crush_detector_db | gzip | \
  aws s3 cp - s3://my-backups/crush-detector/backup-$(date +%Y%m%d).sql.gz
```

================================================================================
MONITORING & MAINTENANCE
================================================================================

Key Metrics to Monitor:
- API response time (target: <200ms)
- Database query performance
- Error rates (target: <0.1%)
- Server CPU/memory usage
- Database size growth
- Active user count

Setup Monitoring:
```bash
# Install Node.js monitoring
npm install pm2-monitoring
pm2 start server.js --name crush-detector

# View dashboard
pm2 monit
```

Regular Maintenance Tasks:
1. Check database integrity: `ANALYZE;`
2. Vacuum unused space: `VACUUM;`
3. Update dependencies: `npm audit`, `npm update`
4. Review logs for errors
5. Test database backups

================================================================================
SECURITY CHECKLIST
================================================================================

□ Change all default passwords
□ Generate new JWT secrets (use 32+ character random strings)
□ Enable HTTPS/SSL in production
□ Set up firewall rules
□ Enable rate limiting
□ Use environment variables for secrets
□ Implement CSRF protection
□ Set security headers (Helmet.js)
□ Enable database encryption
□ Set up regular backups
□ Implement logging and monitoring
□ Review and update dependencies
□ Conduct security audit
□ Enable two-factor authentication (future)
□ Implement API key authentication (future)

================================================================================
CONCLUSION
================================================================================

Your Mutual Crush Detector application is now ready for development and 
production deployment. Follow this guide carefully for a smooth setup.

For issues or questions, refer to the troubleshooting section or check:
- Project documentation
- GitHub issues
- Stack Overflow (tag with 'crush-detector')

Happy coding! 💘

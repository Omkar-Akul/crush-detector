# 💘 Mutual Crush Detector

Find out if your crush likes you back! A modern web application that helps users discover mutual romantic interests through a clever matching system.

## 📋 Overview

The Mutual Crush Detector is a full-stack web application that allows users to:

- Create secure accounts with profile information
- Search and discover other users
- Declare crushes on people they're interested in
- Automatically detect when two people have mutually declared interest in each other
- View their matches and connect with people who like them back
- Get notified when someone has a crush on them

## ✨ Features

### User Management
- ✅ Secure user registration and authentication
- ✅ JWT-based session management
- ✅ User profiles with photos and bio
- ✅ Profile completion tracking
- ✅ Email verification support

### Crush Declaration System
- ✅ Search for users to declare crushes on
- ✅ Track confidence level for each crush (1-10 scale)
- ✅ View list of crushes you've declared
- ✅ See who has a crush on you
- ✅ Anonymous crush declarations (optional)
- ✅ Crush status tracking (mutual, unrequited, not found)

### Match Detection & Management
- ✅ Automatic mutual crush detection using database triggers
- ✅ Real-time notifications for new matches
- ✅ View all your matches
- ✅ React to matches with emotions
- ✅ Send initial messages to matched users
- ✅ Privacy controls for match visibility

### Additional Features
- ✅ Notification system
- ✅ Profile view tracking
- ✅ Match history and analytics
- ✅ Rate limiting and security headers
- ✅ Responsive mobile-friendly design
- ✅ Dark mode ready

## 🏗️ Architecture

```
Crush Detector
├── Frontend (React)
│   ├── Components
│   ├── Pages (Auth, Dashboard, Search, Matches)
│   └── Styling (CSS)
│
├── Backend (Node.js + Express)
│   ├── API Routes
│   ├── Authentication (JWT)
│   ├── Database Queries
│   └── Business Logic
│
└── Database (PostgreSQL)
    ├── Users
    ├── Crush Declarations
    ├── Matches
    └── Notifications
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/crush-detector.git
cd crush-detector
```

2. **Setup Database**
```bash
# Create PostgreSQL database
createdb crush_detector_db
createuser crush_user

# Import schema
psql -U crush_user -d crush_detector_db -f DATABASE_SCHEMA.sql
```

3. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

4. **Setup Frontend**
```bash
cd ../frontend
npm install
npm start
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API Docs: http://localhost:5000/api/health

## 📁 Project Structure

```
crush-detector/
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   └── constants.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── crushController.js
│   │   └── matchController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── crushRoutes.js
│   │   └── matchRoutes.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── public/
│   ├── package.json
│   └── .env
│
├── DATABASE_SCHEMA.sql
├── BACKEND_API_DOCUMENTATION.md
├── SETUP_AND_DEPLOYMENT_GUIDE.md
└── README.md
```

## 🔑 Key Technologies

### Frontend
- **React 18**: UI library
- **CSS3**: Styling with CSS variables
- **Fetch API**: HTTP client
- **React Router**: Navigation

### Backend
- **Node.js**: Runtime
- **Express.js**: Web framework
- **PostgreSQL**: Database
- **bcryptjs**: Password hashing
- **JWT**: Authentication tokens
- **Helmet**: Security headers

### DevOps
- **Docker** (optional): Containerization
- **PM2**: Process management
- **Nginx**: Reverse proxy
- **Let's Encrypt**: SSL certificates

## 🔐 Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT token-based authentication
- ✅ CORS protection
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Security headers (Helmet.js)
- ✅ Environment variable protection
- ✅ HTTPS in production
- ✅ Secure session management
- ✅ Input validation with Joi

## 📊 Database Schema

### Core Tables

**users**
- id, username, email, password_hash
- display_name, bio, profile_photo_url
- date_of_birth, status, is_email_verified
- created_at, updated_at

**crush_declarations**
- id, user_id, crush_user_id, crush_username
- confidence_level (1-10)
- is_anonymous, status
- declared_at, updated_at

**matches**
- id, user_1_id, user_2_id
- match_status (matched, unrequited, rejected)
- mutual_at, user_1_reaction, user_2_reaction
- initial_message, is_private

**notifications**
- id, user_id, notification_type
- title, message, related_user_id
- is_read, created_at, read_at

**sessions**
- id, user_id, token
- ip_address, user_agent
- expires_at, last_activity_at

## 🌐 API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
POST   /api/auth/refresh-token     - Refresh access token
POST   /api/auth/logout            - Logout user
```

### Users
```
GET    /api/users/me               - Get current user
GET    /api/users/:username        - Get user profile
PUT    /api/users/profile          - Update profile
POST   /api/users/upload-profile-photo
```

### Crushes
```
POST   /api/crushes/declare        - Declare a crush
GET    /api/crushes/search         - Search for users
GET    /api/crushes/my-crushes     - Get your crushes
GET    /api/crushes/crushing-on-me - Get admirers
DELETE /api/crushes/:crushId       - Remove crush
```

### Matches
```
GET    /api/matches                - Get all matches
GET    /api/matches/:matchId       - Get match details
POST   /api/matches/:matchId/react - React to match
POST   /api/matches/:matchId/message - Send message
```

### Notifications
```
GET    /api/notifications          - Get notifications
PUT    /api/notifications/:id/read - Mark as read
PUT    /api/notifications/read-all - Mark all as read
```

See `BACKEND_API_DOCUMENTATION.md` for detailed endpoint specifications.

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### API Testing with cURL
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test@123","display_name":"Test"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test@123"}'
```

### Frontend Testing
```bash
cd frontend
npm test              # Run tests
npm run build         # Production build
```

## 📚 Documentation

- **[Database Schema](./DATABASE_SCHEMA.sql)** - Complete SQL schema with triggers
- **[API Documentation](./BACKEND_API_DOCUMENTATION.md)** - Detailed endpoint documentation
- **[Setup & Deployment Guide](./SETUP_AND_DEPLOYMENT_GUIDE.md)** - Installation and deployment instructions

## 🚢 Deployment

### Development
```bash
npm run dev  # Runs with nodemon for auto-reload
```

### Production
```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd ../backend
NODE_ENV=production npm start
```

### Cloud Deployment

**Heroku**
```bash
heroku create crush-detector-api
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

**AWS EC2, Vercel, Netlify** - See full guide in SETUP_AND_DEPLOYMENT_GUIDE.md

## 📱 Usage Examples

### 1. Register and Create Profile
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john_doe',
    email: 'john@example.com',
    password: 'SecurePass123',
    display_name: 'John Doe'
  })
});
```

### 2. Declare a Crush
```javascript
const response = await fetch('/api/crushes/declare', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    crush_username: 'jane_doe',
    confidence_level: 8
  })
});
// If Jane also has a crush on John, they'll be automatically matched!
```

### 3. Search for Users
```javascript
const response = await fetch('/api/crushes/search?q=jane', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
```

### 4. View Your Matches
```javascript
const response = await fetch('/api/matches', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Code Standards

- **ESLint** for linting
- **Prettier** for code formatting
- **Jest** for testing
- Follows Airbnb JavaScript style guide

## 🐛 Bug Reports

Found a bug? Please create an issue with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- System information

## 💬 Support

- GitHub Issues: https://github.com/yourusername/crush-detector/issues
- Email: support@crushdetector.com
- Documentation: See docs folder

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- React community for amazing tools
- PostgreSQL for reliable database
- Express.js for robust web framework
- All contributors and testers

## 🎯 Future Enhancements

- [ ] Real-time messaging with WebSockets
- [ ] Video verification
- [ ] Advanced matching algorithm (based on interests)
- [ ] Compatibility score
- [ ] Premium subscription features
- [ ] Mobile apps (iOS/Android)
- [ ] AI-powered personality matching
- [ ] Group crushes/events
- [ ] Integration with social media
- [ ] Two-factor authentication

## 📊 Project Statistics

- **Lines of Code**: ~3500 (backend) + ~2000 (frontend)
- **Database Tables**: 7
- **API Endpoints**: 20+
- **Test Coverage**: Target 80%+
- **Response Time**: <200ms average
- **Uptime Target**: 99.9%

## 🌟 Star History

If you find this project helpful, please consider giving it a star! ⭐

---

**Made with 💕 for people in love**

Last updated: January 2024 | Version: 1.0.0

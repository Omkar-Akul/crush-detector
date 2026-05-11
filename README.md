# 💘 Crush Detector (Mutual Matching System)

Find out if your crush likes you back! 
A modern web application that helps users to anonymously declare crushes and discover mutual connections.

## 📋 Overview

Crush Detector is a privacy-focused web application built with React, Node.js, Express, and PostgreSQL.

The platform allows users to:
- Create and manage secure accounts
- Search and interact with other users
- Declare anonymous crushes
- Detect mutual matches automatically
- Receive notifications for interactions and matches

The project demonstrates:
- Authentication and authorization workflows
- REST API architecture
- Relational database design
- Full-stack application structure
- Privacy-focused interaction controls

## ✨ Features

### 👤 User Management
- Secure user registration and login system  
- Profile creation and updates  
- Protected routes with authentication  

### 💘 Crush & Match System
- Anonymous crush declarations between users  
- Mutual match detection with automatic pairing  
- Crush status tracking (mutual / unrequited)  
- Match interaction support  

### 🔔 Notifications & Activity
- Match and interaction notifications  
- User activity updates and engagement tracking  
- Match history tracking  

### 🔎 Discovery
- User search and profile lookup  
- Discover potential connections  

### 🔐 Security & Privacy
- Password hashing using bcrypt  
- Rate limiting and API protection  
- Privacy-focused anonymous interaction system  

## 🔑 Tech Stack

### Frontend
- React 18 – UI library  
- CSS3 – Styling with CSS variables  
- Fetch API – HTTP requests  
- React Router – Navigation  

### Backend
- Node.js – Runtime  
- Express.js – Web framework  
- PostgreSQL – Database  
- bcryptjs – Password hashing  
- JWT – Authentication tokens  
- Helmet – Security headers  

### DevOps
- Docker (optional) – Containerization  
- PM2 – Process management  
- Nginx – Reverse proxy  
- Let's Encrypt – SSL certificates  

## 🏗️ Architecture

Crush declarations are processed through backend services that evaluate mutual interest and generate matches, which are then persisted in the database and reflected in the user interface.

```text
Crush Detector
├── Frontend (React)
│   ├── Components
│   ├── Pages (Auth, Dashboard, Search, Matches)
│   └── Styling (CSS)
│
├── Backend (Node.js + Express)
│   ├── API Routes
│   ├── Authentication (JWT)
│   ├── Business Logic (Match Engine, Crush Processing)
│   └── Database Operations
│
└── Database (PostgreSQL)
    ├── Users
    ├── Crush Declarations
    ├── Matches
    └── Notifications
```
## 📊 Database Schema

The system uses a relational PostgreSQL schema to manage users, crush declarations, matches, and notifications with clear relationships between entities.

### Core Tables

| Table                 | Purpose                                          |
|----------------------|--------------------------------------------------|
| `users`              | Stores user accounts and profile information     |
| `crush_declarations` | Tracks crush declarations between users          |
| `matches`            | Stores mutual matches and user interactions      |
| `notifications`      | Manages user notifications and alerts            |
| `sessions`           | Manages authentication sessions and tokens       |

**Database schema:** [Database Schema](./DATABASE_SCHEMA.sql)

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
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
# Configure environment variables (DB credentials, JWT secret, etc.)
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
- Health Check: http://localhost:5000/api/health

## 📁 Project Structure

```text
crush-detector/
├── backend/          # Express API and business logic
├── frontend/         # React frontend application
├── DATABASE_SCHEMA.sql
├── BACKEND_API_DOCUMENTATION.md
├── SETUP_AND_DEPLOYMENT_GUIDE.md
└── README.md

backend/
├── config/
├── controllers/
├── middleware/
├── routes/
└── server.js

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── App.jsx
│   └── App.css
└── public/
```

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
GET    /api/users/me                   - Get current user
GET    /api/users/:username            - Get user profile
PUT    /api/users/profile              - Update profile
POST   /api/users/upload-profile-photo - Upload profile photo
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
GET    /api/matches                  - Get all matches
GET    /api/matches/:matchId         - Get match details
POST   /api/matches/:matchId/react   - React to match
POST   /api/matches/:matchId/message - Send message
```

### Notifications
```
GET    /api/notifications          - Get notifications
PUT    /api/notifications/:id/read - Mark as read
PUT    /api/notifications/read-all - Mark all as read
```

- **API Documentation:** [Backend API Documentation](./BACKEND_API_DOCUMENTATION.md)

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

- **Deployment (AWS EC2 / Vercel / Netlify):** [Setup & Deployment Guide](./SETUP_AND_DEPLOYMENT_GUIDE.md)

## 📚 Documentation

- **[Database Schema](./DATABASE_SCHEMA.sql)** - Complete SQL schema with triggers
- **[API Documentation](./BACKEND_API_DOCUMENTATION.md)** - Detailed endpoint documentation
- **[Setup & Deployment Guide](./SETUP_AND_DEPLOYMENT_GUIDE.md)** - Installation and deployment instructions


## 📝 Code Standards

This project follows consistent coding and testing practices to maintain quality and scalability.

- **ESLint** – Code linting and error prevention  
- **Prettier** – Consistent code formatting  
- **Jest** – Unit and integration testing  
- Follows **Airbnb JavaScript style guide** for code consistency  

---
## 🔐 Security Features

### Authentication & Access Control
- JWT-based authentication for stateless session management  
- Password hashing using bcryptjs  

### API Protection
- CORS configured for controlled cross-origin access  
- Rate limiting to prevent abuse and brute-force attacks  
- Input validation to ensure safe and sanitized requests  

### Infrastructure Security
- Helmet middleware for secure HTTP headers  
- Environment-based configuration for sensitive credentials  

### Production Security
- HTTPS enabled using SSL/TLS (Let's Encrypt)  
- Secure handling of sessions and authentication tokens in production  

## 🤝 Contributing

1. Fork the repository  
2. Create a feature branch 
  `git checkout -b feature/amazing-feature`  
3. Commit changes 
  `git commit -m 'Add: brief description'`  
4. Push to branch 
  `git push origin feature/amazing-feature`  
5. Open a Pull Request with proper description of changes

## 🐛 Bug Reports

If you encounter any issues, please open a GitHub issue and include:

- Clear description of the problem  
- Steps to reproduce  
- Expected vs actual behavior  
- Screenshots, logs, or error messages (if applicable)  
- Environment details (OS, browser, Node.js version)  

---

## 💬 Support

For questions, suggestions, or help:

- Open a GitHub issue for bugs or feature requests  
- Refer to the project documentation for technical details  
- Use GitHub Discussions (if enabled) for general queries


## 🎯 Future Enhancements

The following features are planned to further improve the platform:

### Real-time Features
- Messaging
- Notifications

### AI/Intelligence
- Matching algorithm
- Personality matching

### Platform Expansion
- Mobile apps
- Social integrations

## 📊 Project Status

- Core system fully functional  
- Authentication and matching system implemented  
- Actively improving performance and scalability  
- Open to contributions  


## 🙏 Acknowledgments

- React community for amazing tools
- PostgreSQL for reliable database
- Express.js for robust web framework
- All contributors and testers

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.



import React, { useState, useEffect } from 'react';
import './App.css';

// ============================================================================
// MUTUAL CRUSH DETECTOR - REACT FRONTEND
// ============================================================================

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('login');
    const [token, setToken] = useState(localStorage.getItem('accessToken'));

    useEffect(() => {
        if (token) {
            fetchCurrentUser();
        }
    }, [token]);

    const fetchCurrentUser = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setCurrentUser(data.user);
                setCurrentPage('dashboard');
            } else {
                localStorage.removeItem('accessToken');
                setToken(null);
                setCurrentUser(null);
                setCurrentPage('login');
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            localStorage.removeItem('accessToken');
            setToken(null);
            setCurrentUser(null);
            setCurrentPage('login');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        setToken(null);
        setCurrentUser(null);
        setCurrentPage('login');
    };

    return (
        <div className="app">
            <header className="header">
                <div className="header-content">
                    <h1 className="logo">💘 CrushDetector</h1>
                    {currentUser && (
                        <div className="user-section">
                            <span className="welcome-text">Welcome, {currentUser.display_name}</span>
                            <button className="logout-btn" onClick={handleLogout}>Logout</button>
                        </div>
                    )}
                </div>
            </header>

            <main className="main-content">
                {!token ? (
                    currentPage === 'login' ? (
                        <LoginPage setToken={setToken} onSwitchPage={() => setCurrentPage('register')} />
                    ) : (
                        <RegisterPage setToken={setToken} onSwitchPage={() => setCurrentPage('login')} />
                    )
                ) : (
                    <DashboardPage 
                        user={currentUser} 
                        token={token}
                        setCurrentPage={setCurrentPage}
                        currentPage={currentPage}
                    />
                )}
            </main>
        </div>
    );
}

// ============================================================================
// LOGIN PAGE
// ============================================================================

function LoginPage({ setToken, onSwitchPage }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('accessToken', data.tokens.accessToken);
                localStorage.setItem('refreshToken', data.tokens.refreshToken);
                setToken(data.tokens.accessToken);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (error) {
            setError('Connection error. Please try again.');
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Welcome Back!</h2>
                <p className="subtitle">Find out if your crush likes you back</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="switch-text">
                    Don't have an account? <button onClick={onSwitchPage} className="link-btn">Sign up</button>
                </p>
            </div>

            <div className="auth-decoration">
                <div className="floating-heart">💕</div>
                <div className="floating-heart">💖</div>
                <div className="floating-heart">💗</div>
            </div>
        </div>
    );
}

// ============================================================================
// REGISTER PAGE
// ============================================================================

function RegisterPage({ setToken, onSwitchPage }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        display_name: '',
        date_of_birth: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('accessToken', data.tokens.accessToken);
                localStorage.setItem('refreshToken', data.tokens.refreshToken);
                setToken(data.tokens.accessToken);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (error) {
            setError('Connection error. Please try again.');
            console.error('Registration error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Join CrushDetector!</h2>
                <p className="subtitle">Create account to find your match</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Choose a username"
                            minLength="3"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Display Name</label>
                        <input
                            type="text"
                            name="display_name"
                            value={formData.display_name}
                            onChange={handleChange}
                            placeholder="Your full name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password (min 8 chars)</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Choose a strong password"
                            minLength="8"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                            type="date"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="switch-text">
                    Already have an account? <button onClick={onSwitchPage} className="link-btn">Login</button>
                </p>
            </div>

            <div className="auth-decoration">
                <div className="floating-heart">💕</div>
                <div className="floating-heart">💖</div>
                <div className="floating-heart">💗</div>
            </div>
        </div>
    );
}

// ============================================================================
// DASHBOARD PAGE
// ============================================================================

function DashboardPage({ user, token, setCurrentPage, currentPage }) {
    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <button 
                    className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('dashboard')}
                >
                    🏠 Home
                </button>
                <button 
                    className={`nav-item ${currentPage === 'search' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('search')}
                >
                    🔍 Search
                </button>
                <button 
                    className={`nav-item ${currentPage === 'crushes' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('crushes')}
                >
                    💘 My Crushes
                </button>
                <button 
                    className={`nav-item ${currentPage === 'matches' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('matches')}
                >
                    💕 Matches
                </button>
                <button 
                    className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('profile')}
                >
                    👤 Profile
                </button>
            </nav>

            <div className="dashboard-content">
                {currentPage === 'dashboard' && <HomePage user={user} token={token} />}
                {currentPage === 'search' && <SearchPage token={token} />}
                {currentPage === 'crushes' && <CrushesPage token={token} />}
                {currentPage === 'matches' && <MatchesPage token={token} />}
                {currentPage === 'profile' && <ProfilePage user={user} token={token} />}
            </div>
        </div>
    );
}

// ============================================================================
// HOME PAGE
// ============================================================================

function HomePage({ user, token }) {
    const [stats, setStats] = useState({ crushes: 0, matches: 0, views: 0 });
    const [recentMatches, setRecentMatches] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch(`${API_URL}/api/matches?limit=3`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
                setRecentMatches(data.matches);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    return (
        <div className="page home-page">
            <div className="hero-section">
                <h1>Welcome, {user.display_name}! 👋</h1>
                <p>Your journey to discovering mutual crushes starts here</p>
            </div>

            <div className="stats-grid">
                <StatCard 
                    icon="💭" 
                    label="My Crushes" 
                    value={stats.crushes}
                    color="#FF6B9D"
                />
                <StatCard 
                    icon="💕" 
                    label="Mutual Matches" 
                    value={stats.mutual_matches}
                    color="#FF1493"
                />
                <StatCard 
                    icon="👀" 
                    label="Profile Views" 
                    value={stats.profile_views}
                    color="#FFB6C1"
                />
            </div>

            <section className="recent-matches">
                <h2>Your Recent Matches 💕</h2>
                {recentMatches.length > 0 ? (
                    <div className="matches-list">
                        {recentMatches.map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                ) : (
                    <EmptyState 
                        icon="💔"
                        message="No matches yet"
                        submessage="Start by declaring your crush!"
                    />
                )}
            </section>
        </div>
    );
}

// ============================================================================
// SEARCH PAGE
// ============================================================================

function SearchPage({ token }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchQuery.trim().length < 2) {
            setMessage('Search query must be at least 2 characters');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(
                `${API_URL}/api/crushes/search?q=${encodeURIComponent(searchQuery)}&limit=20`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success) {
                setSearchResults(data.results);
                if (data.results.length === 0) {
                    setMessage('No users found. Try a different search!');
                }
            }
        } catch (error) {
            setMessage('Error searching. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page search-page">
            <div className="search-header">
                <h2>Find Your Crush 🔍</h2>
                <p>Search for users to declare your crush on</p>
            </div>

            <form className="search-form" onSubmit={handleSearch}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or name..."
                    className="search-input"
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {message && <div className="message-box">{message}</div>}

            <div className="search-results">
                {searchResults.length > 0 && (
                    <div className="users-grid">
                        {searchResults.map(user => (
                            <UserCard key={user.id} user={user} token={token} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// CRUSHES PAGE
// ============================================================================

function CrushesPage({ token }) {
    const [crushes, setAllCrushes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCrushes();
    }, []);

    const fetchCrushes = async () => {
        setLoading(true);
        try {
            const myCrushesRes = await fetch(`${API_URL}/api/crushes/my-crushes`,
                { headers: { 'Authorization': `Bearer ${token}` } });
            const myCrushesData = await myCrushesRes.json();
            if (myCrushesData.success) setAllCrushes(myCrushesData.crushes);
        } catch (error) {
            console.error('Error fetching crushes:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page crushes-page">
            <h2>Your Crushes 💘</h2>
            <p className="subtitle">Your crushes are kept anonymous — you'll only be revealed to each other on a mutual match! 🔒</p>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="crushes-list">
                    {crushes.length > 0 ? (
                        crushes.map(crush => (
                            <CrushCard key={crush.id} crush={crush} />
                        ))
                    ) : (
                        <EmptyState
                            icon="💔"
                            message="You haven't declared any crushes yet"
                            submessage="Use the search to find someone special!"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// MATCHES PAGE
// ============================================================================

function MatchesPage({ token }) {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            const response = await fetch(
                `${API_URL}/api/matches?status=matched`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success) {
                setMatches(data.matches);
            }
        } catch (error) {
            console.error('Error fetching matches:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page matches-page">
            <div className="matches-header">
                <h2>💕 Your Matches 💕</h2>
                <p>These are your mutual crushes! You like each other</p>
            </div>

            {loading ? (
                <div className="loading">Loading your matches...</div>
            ) : matches.length > 0 ? (
                <div className="matches-grid">
                    {matches.map(match => (
                        <MatchCard key={match.id} match={match} />
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon="💔"
                    message="You don't have any matches yet"
                    submessage="Keep exploring and declaring crushes!"
                />
            )}
        </div>
    );
}

// ============================================================================
// PROFILE PAGE
// ============================================================================

function ProfilePage({ user, token }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        display_name: user.display_name || '',
        bio: user.bio || '',
        profile_photo_url: user.profile_photo_url || ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                setIsEditing(false);
                alert('Profile updated successfully!');
            }
        } catch (error) {
            alert('Error updating profile');
        }
    };

    return (
        <div className="page profile-page">
            <div className="profile-card">
                <div className="profile-header">
                    {formData.profile_photo_url && (
                        <img 
                            src={formData.profile_photo_url} 
                            alt="profile" 
                            className="profile-photo"
                        />
                    )}
                    <div>
                        <h2>{user.display_name}</h2>
                        <p>@{user.username}</p>
                    </div>
                </div>

                {isEditing ? (
                    <div className="profile-form">
                        <div className="form-group">
                            <label>Display Name</label>
                            <input
                                type="text"
                                name="display_name"
                                value={formData.display_name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                placeholder="Tell us about yourself..."
                                rows="4"
                            />
                        </div>

                        <div className="form-group">
                            <label>Profile Photo URL</label>
                            <input
                                type="url"
                                name="profile_photo_url"
                                value={formData.profile_photo_url}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="button-group">
                            <button className="btn btn-primary" onClick={handleSave}>
                                Save Changes
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="profile-content">
                        <p className="bio">{formData.bio || 'No bio yet'}</p>
                        <p className="email">📧 {user.email}</p>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit Profile
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

function StatCard({ icon, label, value, color }) {
    return (
        <div className="stat-card" style={{ borderTopColor: color }}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
        </div>
    );
}

function MatchCard({ match }) {
    return (
        <div className="match-card">
            <div className="match-header">
                {match.profile_photo_url && (
                    <img src={match.profile_photo_url} alt={match.display_name} />
                )}
                <div>
                    <h3>{match.display_name}</h3>
                    <p>@{match.username}</p>
                </div>
            </div>
            <p className="match-date">Matched on {new Date(match.mutual_at).toLocaleDateString()}</p>
            {match.user_1_reaction && <p className="reaction">Your reaction: {match.user_1_reaction}</p>}
        </div>
    );
}

function CrushCard({ crush }) {
    return (
        <div className="crush-card">
            {crush.profile_photo_url && (
                <img src={crush.profile_photo_url} alt={crush.crush_display_name} />
            )}
            <div className="crush-info">
                <h3>{crush.crush_display_name}</h3>
                <p>@{crush.crush_username}</p>
                <div className="crush-status">
                    {crush.crush_status === 'mutual' && <span className="badge mutual">💕 MUTUAL MATCH!</span>}
                    {crush.crush_status === 'already_matched' && <span className="badge matched">💔 Already matched with someone else</span>}
                    {crush.crush_status === 'crushing_on_someone_else' && <span className="badge other">👀 Crushing on someone else</span>}
                    {crush.crush_status === 'no_crush_declared' && <span className="badge pending">⏳ No crush declared yet</span>}
                </div>
                <p className="confidence">Confidence: {crush.confidence_level}/10</p>
            </div>
        </div>
    );
}

function UserCard({ user, token }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleDeclareCrush = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/crushes/declare`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    crush_username: user.username,
                    confidence_level: 8,
                    is_anonymous: false
                })
            });

            const data = await response.json();
            if (data.success) {
                if (data.crush.crush_status === 'mutual') {
                    setMessage('🎉 MUTUAL CRUSH! You both like each other!');
                } else if (data.crush.crush_status === 'already_matched') {
                    setMessage('💔 Crush declared, but they are already matched with someone else.');
                } else if (data.crush.crush_status === 'crushing_on_someone_else') {
                    setMessage('💘 Crush declared! They seem to be crushing on someone else, but who knows! 🤫');
                } else {
                    setMessage('💘 Crush declared! They haven\'t declared a crush yet. Stay hopeful! 🤞');
                }
            } else {
                setMessage(data.error);
            }
        } catch (error) {
            setMessage('Error declaring crush');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="user-card">
            {user.profile_photo_url && (
                <img src={user.profile_photo_url} alt={user.display_name} />
            )}
            <div className="user-info">
                <h3>{user.display_name}</h3>
                <p>@{user.username}</p>
                <p className="bio-preview">{user.bio}</p>
                <div className="crush-indicators">
                    {user.you_have_crush_on_them && <span className="indicator">💕 You like them</span>}
                </div>
            </div>
            {!user.you_have_crush_on_them && (
                <button 
                    className="btn btn-crush" 
                    onClick={handleDeclareCrush}
                    disabled={loading}
                >
                    {loading ? 'Declaring...' : '💘 Declare Crush'}
                </button>
            )}
            {user.you_have_crush_on_them && (
                <button className="btn btn-secondary" disabled>
                    💕 Already Declared
                </button>
            )}
            {message && <p className="message">{message}</p>}
        </div>
    );
}

function EmptyState({ icon, message, submessage }) {
    return (
        <div className="empty-state">
            <div className="empty-icon">{icon}</div>
            <h3>{message}</h3>
            <p>{submessage}</p>
        </div>
    );
}

export default App;

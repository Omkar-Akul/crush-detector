/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import './App.css';
import InstallBanner from './InstallBanner';
import './ChatStyles.css';
import { Heart, LogOut, User, ShieldCheck, Mail, Lock, UserPlus, LogIn, ChevronRight, CheckCircle, Clock, Trash2, ShieldAlert, Menu, X, Search, MessageCircle, Send } from 'lucide-react';
import { io } from 'socket.io-client';
import ChatModal from './ChatModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('login');
    const [token, setToken] = useState(localStorage.getItem('accessToken'));
    const [appLoading, setAppLoading] = useState(!!localStorage.getItem('accessToken'));
    const [notification, setNotification] = useState(null);

    const showNotification = (message, type = 'info', duration = 3000) => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, duration);
    };

    useEffect(() => {
        if (token) {
            fetchCurrentUser();
        }
    }, [token]);

    const fetchCurrentUser = async () => {
        setAppLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setCurrentUser(data.user);
                if (!data.user.is_email_verified) {
                    setCurrentPage('verify-email');
                } else {
                    setCurrentPage('dashboard');
                }
            } else {
                handleLogout();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            handleLogout();
        } finally {
            setAppLoading(false);
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
            <FloatingHearts />
            <header className="header">
                <div className="header-content">
                    <div className="logo-group">
                        <Heart className="primary-color" fill="var(--primary)" size={28} />
                        <h1 className="logo">CrushDetector</h1>
                    </div>
                    {currentUser && currentUser.is_email_verified && (
                        <div className="user-section">
                            <span className="welcome-text">
                                <User size={14} />
                                {currentUser.display_name}
                            </span>
                            <button className="logout-btn" onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="main-content">
                {appLoading ? (
                    <div className="loading-screen">
                        <Heart className="loading-heart" fill="var(--primary)" size={48} />
                        <p>Preparing your heart...</p>
                    </div>
                ) : !token ? (
                    currentPage === 'login' ? (
                        <LoginPage setToken={setToken} setCurrentUser={setCurrentUser} setCurrentPage={setCurrentPage} onSwitchPage={() => setCurrentPage('register')} />
                    ) : (
                        <RegisterPage setToken={setToken} setCurrentUser={setCurrentUser} setCurrentPage={setCurrentPage} onSwitchPage={() => setCurrentPage('login')} />
                    )
                ) : currentPage === 'verify-email' ? (
                    <OTPVerificationPage
                        token={token}
                        email={currentUser?.email || ''}
                        onVerified={() => fetchCurrentUser()}
                    />
                ) : (
                    <DashboardPage
                        user={currentUser}
                        token={token}
                        setCurrentPage={setCurrentPage}
                        currentPage={currentPage}
                        showNotification={showNotification}
                    />
                )}
            </main>
            {notification && <Notification message={notification.message} type={notification.type} />}
            <InstallBanner />
        </div>
    );
}


// ============================================================================
// NOTIFICATION COMPONENT
// ============================================================================

function Notification({ message, type }) {
    const icon = {
        success: <CheckCircle size={20} />,
        error: <ShieldAlert size={20} />,
        info: <Heart size={20} />,
    }[type];

    return (
        <div className={`notification toast-${type}`}>
            <div className="toast-icon">{icon}</div>
            <p>{message}</p>
        </div>
    );
}

// ============================================================================
// OTP VERIFICATION PAGE
// ============================================================================

function OTPVerificationPage({ token, email, onVerified }) {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ otp })
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('✅ Account verified! Redirecting...');
                setTimeout(onVerified, 1500);
            } else {
                setError(data.error || 'Invalid code. Try again.');
            }
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError('');
        setSuccess('');
        try {
            const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('📧 New code sent! Check your email.');
                setResendCooldown(60);
            } else {
                setError(data.error || 'Could not resend code.');
            }
        } catch {
            setError('Connection error.');
        }
    };

    return (
        <div className="auth-container fade-in">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon-wrapper">
                        <Mail className="primary-color" size={32} />
                    </div>
                    <h2>Verify your email</h2>
                    <p>We sent a 6-digit code to<br /><strong>{email}</strong></p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleVerify}>
                    <div className="form-group">
                        <input
                            type="text"
                            id="otp-input"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="input-premium"
                            maxLength={6}
                            autoFocus
                            required
                        />
                    </div>
                    <button type="submit" className="btn-premium" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify Account'}
                    </button>
                </form>

                <div className="resend-container">
                    <p>
                        Didn't receive it?{' '}
                        {resendCooldown > 0 ? (
                            <span>Retry in {resendCooldown}s</span>
                        ) : (
                            <button onClick={handleResend} className="switch-btn resend-btn">Resend code</button>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// LOGIN PAGE
// ============================================================================

function LoginPage({ setToken, setCurrentUser, setCurrentPage, onSwitchPage }) {

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
                setCurrentUser(data.user);
                setToken(data.tokens.accessToken);
                if (data.requiresVerification) {
                    setCurrentPage('verify-email');
                } else {
                    setCurrentPage('dashboard');
                }
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
        <div className="auth-container fade-in">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Find out if your crush likes you back</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <User size={18} className="input-icon" />
                        <input
                            type="text"
                            className="input-premium input-with-icon"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <Lock size={18} className="input-icon" />
                        <input
                            type="password"
                            className="input-premium input-with-icon"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                        />
                    </div>

                    <button type="submit" className="btn-premium" disabled={loading}>
                        {loading ? 'Entering...' : 'Login to Dashboard'}
                        <LogIn size={18} />
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account? <button onClick={onSwitchPage} className="switch-btn">Create one now</button>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// REGISTER PAGE
// ============================================================================

function RegisterPage({ setToken, setCurrentUser, setCurrentPage, onSwitchPage }) {
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
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

            const result = await response.json();

            if (result.success) {
                localStorage.setItem('accessToken', result.tokens.accessToken);
                localStorage.setItem('refreshToken', result.tokens.refreshToken);
                setCurrentUser(result.user);
                setToken(result.tokens.accessToken);
                setCurrentPage('verify-email');
            } else {
                setError(result.error || 'Registration failed');
            }
        } catch (error) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container fade-in">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Join the Circle</h2>
                    <p>Find out who likes you back!</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleRegister}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <input type="text" name="username" className="input-premium" value={formData.username} onChange={handleChange} placeholder="Username" required />
                        <input type="text" name="display_name" className="input-premium" value={formData.display_name} onChange={handleChange} placeholder="Full Name" required />
                    </div>

                    <div className="form-group">
                        <input type="email" name="email" className="input-premium" value={formData.email} onChange={handleChange} placeholder="Email Address" required />
                    </div>
                    <div className="form-group">
                        <input type="password" name="password" className="input-premium" value={formData.password} onChange={handleChange} placeholder="Password (min 8 chars)" required />
                    </div>

                    <div className="form-group">
                        <label>Date of Birth</label>
                        <input type="date" name="date_of_birth" className="input-premium" value={formData.date_of_birth} onChange={handleChange} />
                    </div>

                    <button type="submit" className="btn-premium" disabled={loading}>
                        {loading ? 'Processing...' : 'Create Account'}
                        <ChevronRight size={18} />
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Already a member? <button onClick={onSwitchPage} className="switch-btn">Sign In</button>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// VERIFICATION MODAL
// ============================================================================

function VerificationModal({ token, onClose, onSuccess, isInitial = false }) {
    const [formData, setFormData] = useState({
        verification_type: 'college',
        college_name: ''
    });
    const [idPhoto, setIdPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!idPhoto) {
            setError('Please select or take a photo of your ID');
            return;
        }
        setLoading(true);
        setError('');

        const data = new FormData();
        data.append('verification_type', 'college');
        data.append('college_name', formData.college_name);
        data.append('student_id_photo', idPhoto);

        try {
            const res = await fetch(`${API_URL}/api/users/reapply`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });
            const result = await res.json();
            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'Failed to submit verification');
            }
        } catch {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container fade-in">
                <button onClick={onClose} className="modal-close-btn"><X size={20} /></button>
                
                <div className="auth-header">
                    <div className="auth-icon-wrapper" style={{background: 'rgba(255, 51, 102, 0.1)'}}>
                        <ShieldCheck className="primary-color" size={32} />
                    </div>
                    <h2>{isInitial ? 'Identity Verification' : 'Re-submit Verification'}</h2>
                    <p>Upload your Student ID to access all features.</p>
                </div>
                
                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>College/University Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Stanford University" 
                            className="input-premium" 
                            value={formData.college_name} 
                            onChange={e => setFormData({...formData, college_name: e.target.value})} 
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <label>Student ID Card Photo</label>
                        <input 
                            type="file" 
                            id="student-id-upload"
                            onChange={e => setIdPhoto(e.target.files[0])} 
                            accept="image/*" 
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="student-id-upload" className={`upload-area ${idPhoto ? 'has-file' : ''}`}>
                            <div className={`upload-area-content ${idPhoto ? 'has-file' : ''}`}>
                                {idPhoto ? (
                                    <>
                                        <CheckCircle size={32} />
                                        <p>{idPhoto.name}</p>
                                        <span>Click to change photo</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={32} />
                                        <p>Click to Take Photo or Upload</p>
                                        <span>Supports Camera & Gallery</span>
                                    </>
                                )}
                            </div>
                        </label>
                        <p className="helper-text">
                            💡 If you face issues, try a different browser (Chrome, Safari, Opera).
                        </p>
                    </div>

                    <button type="submit" className="btn-premium" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ============================================================================
// DASHBOARD PAGE
// ============================================================================

function DashboardPage({ user, token, setCurrentPage, currentPage, showNotification }) {
    const [showReapplyModal, setShowReapplyModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleNavClick = (page) => {
        setCurrentPage(page);
        setIsMobileMenuOpen(false);
    };

    const handleVerificationSuccess = () => {
        setShowReapplyModal(false);
        showNotification('Verification submitted! We will review it shortly.', 'success');
    };

    return (
        <div className="dashboard-layout">
            {showReapplyModal && (
                <VerificationModal 
                    token={token} 
                    isInitial={!user.verification_status}
                    onClose={() => setShowReapplyModal(false)} 
                    onSuccess={handleVerificationSuccess} 
                />
            )}

            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
            </button>

            <div className={`sidebar-overlay ${isMobileMenuOpen ? '' : 'hidden'}`} onClick={() => setIsMobileMenuOpen(false)} />

            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-sidebar-header">
                    <div className="logo-group">
                        <Heart fill="var(--primary)" size={24} />
                        <h2 className="logo">CrushDetector</h2>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="modal-close-btn"><X size={20}/></button>
                </div>

                <nav className="dashboard-nav">
                    <NavBtn active={currentPage === 'dashboard'} onClick={() => handleNavClick('dashboard')} icon={<Heart size={18} />} label="Discover" />
                    <NavBtn active={currentPage === 'search'} onClick={() => handleNavClick('search')} icon={<Search size={18} />} label="Find People" />
                    <NavBtn active={currentPage === 'crushes'} onClick={() => handleNavClick('crushes')} icon={<UserPlus size={18} />} label="My Crushes" />
                    <NavBtn active={currentPage === 'matches'} onClick={() => handleNavClick('matches')} icon={<Heart size={18} fill={currentPage === 'matches' ? 'currentColor' : 'none'} />} label="Matches" />
                    <NavBtn active={currentPage === 'chat'} onClick={() => handleNavClick('chat')} icon={<MessageCircle size={18} />} label="Chat" />
                    <NavBtn active={currentPage === 'profile'} onClick={() => handleNavClick('profile')} icon={<User size={18} />} label="Settings" />
                </nav>

                {!user.is_identity_verified && (
                    <div className={`verification-status-box ${user.verification_status === 'rejected' ? 'rejected' : 'pending'}`}>
                        <div className="verification-status-header">
                            {user.verification_status === 'rejected' ? <ShieldAlert size={16} /> : <Clock size={16} />}
                            <span>
                                {user.verification_status === 'rejected' ? 'Verification Rejected' : user.verification_status === 'pending' ? 'Verification Pending' : 'Verify Identity'}
                            </span>
                        </div>
                        <p>
                            {user.verification_status === 'rejected' 
                                ? 'Your ID was not approved. Please re-apply with a clearer photo.' 
                                : user.verification_status === 'pending'
                                ? `We're reviewing your ${user.verification_type} ID.`
                                : 'Verify your student ID to declare crushes and see matches.'}
                        </p>
                        {(user.verification_status === 'rejected' || !user.verification_status) && (
                            <button 
                                onClick={() => setShowReapplyModal(true)}
                                className={`verify-btn ${user.verification_status === 'rejected' ? 'reapply' : 'verify'}`}
                            >
                                {user.verification_status === 'rejected' ? 'Re-apply Now' : 'Verify Now'}
                            </button>
                        )}
                    </div>
                )}
            </aside>

            <main className="dashboard-content fade-in">
                {currentPage === 'dashboard' && <HomePage user={user} token={token} />}
                {currentPage === 'search' && <SearchPage token={token} showNotification={showNotification} />}
                {currentPage === 'crushes' && <CrushesPage token={token} />}
                {currentPage === 'matches' && <MatchesPage token={token} currentUser={user} />}
                {currentPage === 'chat' && <ChatPage token={token} currentUser={user} />}
                {currentPage === 'profile' && <ProfilePage user={user} token={token} />}
            </main>
        </div>
    );
}

function NavBtn({ active, onClick, icon, label }) {
    return (
        <button 
            onClick={onClick}
            className={`nav-item ${active ? 'active' : ''}`}
        >
            {icon}
            <span>{label}</span>
        </button>
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
            <div className="page-header">
                <h1>Hello, {user.display_name.split(' ')[0]}!</h1>
                <p>Here's what's happening with your crushes today.</p>
            </div>

            <div className="stats-grid">
                <StatCard icon={<Heart size={24} />} label="My Crushes" value={stats.crushes} color="var(--primary)" />
                <StatCard icon={<Heart size={24} fill="currentColor" />} label="Mutual Matches" value={stats.mutual_matches} color="#7000ff" />
                <StatCard icon={<User size={24} />} label="Profile Views" value={stats.profile_views} color="#00d4ff" />
            </div>

            <section className="recent-matches">
                <div className="section-header">
                    <h2>Recent Matches</h2>
                </div>
                {recentMatches.length > 0 ? (
                    <div className="items-grid">
                        {recentMatches.map(match => (
                            <MatchCard key={match.id} match={match} onChatClick={() => {
                                // For recent matches, just tell them to go to the Matches tab
                                alert("Please go to the 'Matches' tab in the left menu to chat!");
                            }} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Heart size={30} />
                        </div>
                        <h3>No matches yet</h3>
                        <p>Start searching and declaring your crushes to find a match!</p>
                    </div>
                )}
            </section>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="stat-card">
            <div className="stat-card-glow" style={{ background: color }}></div>
            <div className="stat-card-icon" style={{ color: color }}>{icon}</div>
            <div className="stat-card-value">{value}</div>
            <div className="stat-card-label">{label}</div>
        </div>
    );
}

// ============================================================================
// SEARCH PAGE
// ============================================================================

function SearchPage({ token, showNotification }) {
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
            <div className="page-header">
                <h2>Find Your Person</h2>
                <p>Search by name or username to declare your interest.</p>
            </div>

            <form onSubmit={handleSearch} className="search-form">
                <Search size={20} className="input-icon" style={{left: '1.2rem'}}/>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Who are you looking for?"
                    className="input-premium search-input"
                />
                <button type="submit" className="btn-premium search-submit-btn" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {message && <div className="empty-state" style={{padding: '2rem'}}>{message}</div>}

            <div className="items-grid">
                {searchResults.map(user => (
                    <UserCard key={user.id} user={user} token={token} showNotification={showNotification} />
                ))}
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
            <div className="page-header">
                <h2>Sent Declarations</h2>
                <p>Your declarations are private until matched. 🔒</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}><Clock className="loading-heart" /></div>
            ) : (
                <div className="items-grid">
                    {crushes.length > 0 ? (
                        crushes.map(crush => (
                            <CrushCard key={crush.id} crush={crush} />
                        ))
                    ) : (
                        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                            <div className="empty-state-icon"><Heart size={30} /></div>
                            <h3>No active crushes</h3>
                            <p>Go to Search to declare your first crush!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// MATCHES PAGE
// ============================================================================

function MatchesPage({ token, currentUser }) {
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
            <div className="page-header">
                <h2>💕 Your Matches 💕</h2>
                <p>These are your mutual crushes! You like each other.</p>
            </div>

            {loading ? (
                <div className="loading-screen"><Clock className="loading-heart" /></div>
            ) : matches.length > 0 ? (
                <div className="items-grid">
                    {matches.map(match => (
                        <MatchCard key={match.id} match={match} />
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon={<Heart size={30} />}
                    message="You don't have any matches yet"
                    submessage="Keep exploring and declaring crushes!"
                />
            )}
        </div>
    );
}

// ============================================================================
// CHAT PAGE - SNAPCHAT STYLE
// ============================================================================

function ChatPage({ token, currentUser }) {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredMatches = matches.filter(match => {
        const name = (match.user_1_id === currentUser.id 
            ? (match.user_2_display_name || 'Unknown') 
            : (match.user_1_display_name || 'Unknown')).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    if (loading) {
        return (
            <div className="page chat-page">
                <div className="loading-screen"><Clock className="loading-heart" /></div>
            </div>
        );
    }

    if (matches.length === 0) {
        return (
            <div className="page chat-page">
                <div className="page-header">
                    <h2>💬 Chats</h2>
                </div>
                <EmptyState 
                    icon={<MessageCircle size={30} />}
                    message="No matches to chat with yet"
                    submessage="Find matches in the Matches tab to start chatting!"
                />
            </div>
        );
    }

    // If on mobile and a match is selected, show full screen chat
    if (selectedMatch) {
        return (
            <ChatWindow
                match={selectedMatch}
                token={token}
                userId={currentUser.id}
                onBack={() => setSelectedMatch(null)}
                isMobile={true}
            />
        );
    }

    return (
        <div className="chat-page-container">
            {/* Conversations List */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <h2>💬 Chats</h2>
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="chat-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="conversations-list">
                    {filteredMatches.map((match, idx) => {
                        const otherUserName = match.display_name || match.username || 'Unknown';
                        const otherUserPhoto = match.profile_photo_url;
                        const colors = ['#FF6B9D', '#C06C84', '#6C5B7B', '#355C7D'];
                        const bgColor = colors[idx % colors.length];

                        return (
                            <div 
                                key={match.id}
                                className="conversation-item"
                                onClick={() => setSelectedMatch(match)}
                                style={{'--accent-color': bgColor}}
                            >
                                <div className="conversation-avatar-wrapper" style={{backgroundColor: bgColor}}>
                                    <img 
                                        src={otherUserPhoto || `https://api.dicebear.com/6.x/initials/svg?seed=${otherUserName}`} 
                                        alt={otherUserName}
                                        className="conversation-avatar"
                                    />
                                </div>
                                <div className="conversation-info">
                                    <h3>{otherUserName}</h3>
                                    <p className="last-message">💕 Your match</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chat Window - Desktop Only */}
            {filteredMatches.length > 0 && (
                <ChatWindow
                    match={filteredMatches[0]}
                    token={token}
                    userId={currentUser.id}
                    onBack={() => setSelectedMatch(null)}
                    isMobile={false}
                />
            )}
        </div>
    );
}

// ============================================================================
// CHAT WINDOW COMPONENT
// ============================================================================

function ChatWindow({ match, token, userId, onBack, isMobile }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Daily Question State
    const [dailyQuestion, setDailyQuestion] = useState(null);
    const [questionStatus, setQuestionStatus] = useState(null);
    const [answerInput, setAnswerInput] = useState('');
    const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
    const [isGameExpanded, setIsGameExpanded] = useState(false);

    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    const otherUserId = match.other_user_id;
    const otherUserName = match.display_name || match.username || 'Unknown';
    const otherUserPhoto = match.profile_photo_url;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchDailyQuestion = async () => {
            try {
                const response = await fetch(`${API_URL}/api/games/daily-question/${match.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setDailyQuestion(data.question);
                    setQuestionStatus(data.status);
                    if (!data.status.myAnswer) {
                        setIsGameExpanded(true);
                    }
                }
            } catch (error) {
                console.error("Failed to load daily question:", error);
            }
        };

        const fetchHistory = async () => {
            try {
                const response = await fetch(`${API_URL}/api/matches/${match.id}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setMessages(data.messages);
                }
            } catch (error) {
                console.error("Failed to load chat history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        fetchDailyQuestion();

        const socket = io(API_URL, {
            auth: { token: token },
            withCredentials: true
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('join_match', match.id);
        });

        socket.on('receive_message', (newMsg) => {
            setMessages(prev => [...prev, newMsg]);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            socket.emit('leave_match', match.id);
            socket.disconnect();
        };
    }, [match.id, token]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        socketRef.current.emit('send_message', {
            matchId: match.id,
            receiverId: otherUserId,
            messageText: inputText.trim()
        });

        setInputText('');
    };

    const handleAnswerQuestion = async (e, directAnswer = null) => {
        if (e && e.preventDefault) e.preventDefault();
        const finalAnswer = directAnswer || answerInput;
        if (!finalAnswer.trim() || !dailyQuestion) return;

        setIsSubmittingAnswer(true);
        try {
            const response = await fetch(`${API_URL}/api/games/daily-question/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    matchId: match.id,
                    questionId: dailyQuestion.id,
                    answerText: finalAnswer,
                    gameType: dailyQuestion.gameType || 'question'
                })
            });

            const data = await response.json();
            if (data.success) {
                setQuestionStatus(prev => ({
                    ...prev,
                    myAnswer: finalAnswer,
                    streak: data.streak,
                    bothAnswered: prev.partnerHasAnswered
                }));
                setAnswerInput('');
            }
        } catch (error) {
            console.error("Failed to submit answer:", error);
        } finally {
            setIsSubmittingAnswer(false);
        }
    };

    if (loading) {
        return (
            <div className={`chat-window ${isMobile ? 'mobile-fullscreen' : ''}`}>
                <div className="chat-header">
                    {isMobile && <button className="back-btn" onClick={onBack}><ChevronRight size={20} style={{transform: 'rotate(180deg)'}} /></button>}
                    <div className="chat-header-info">
                        <img src={otherUserPhoto || `https://api.dicebear.com/6.x/initials/svg?seed=${otherUserName}`} alt={otherUserName} className="chat-header-avatar" />
                        <div>
                            <h2>{otherUserName}</h2>
                            <p className="connection-status">{isConnected ? '🟢 Online' : '🔴 Offline'}</p>
                        </div>
                    </div>
                </div>
                <div className="loading-screen"><Clock className="loading-heart" /></div>
            </div>
        );
    }

    return (
        <div className={`chat-window ${isMobile ? 'mobile-fullscreen' : ''}`}>
            <div className="chat-header">
                {isMobile && <button className="back-btn" onClick={onBack}><ChevronRight size={20} style={{transform: 'rotate(180deg)'}} /></button>}
                <div className="chat-header-info">
                    <img src={otherUserPhoto || `https://api.dicebear.com/6.x/initials/svg?seed=${otherUserName}`} alt={otherUserName} className="chat-header-avatar" />
                    <div>
                        <h2>{otherUserName}</h2>
                        <p className="connection-status">{isConnected ? '🟢 Online' : '🔴 Offline'}</p>
                    </div>
                </div>
                {questionStatus && questionStatus.streak > 0 && (
                    <div className="streak-badge" title={`Daily Couple Streak: ${questionStatus.streak}`}>
                        <span>🔥 {questionStatus.streak}</span>
                    </div>
                )}
            </div>

            {dailyQuestion && questionStatus && (
                <div className="daily-game-banner">
                    <div className="daily-game-header" onClick={() => setIsGameExpanded(!isGameExpanded)}>
                        <h4>🎮 Daily Question 🎮</h4>
                        <span>{isGameExpanded ? '▲' : '▼'}</span>
                    </div>
                    {isGameExpanded && (
                        <div className="daily-game-content">
                            <p className="daily-question-text">"{dailyQuestion.text}"</p>
                            
                            {!questionStatus.myAnswer ? (
                                <form onSubmit={handleAnswerQuestion} className="daily-answer-form">
                                    <input 
                                        type="text" 
                                        placeholder="Your answer..." 
                                        value={answerInput}
                                        onChange={(e) => setAnswerInput(e.target.value)}
                                        maxLength={200}
                                    />
                                    <button type="submit" disabled={isSubmittingAnswer || !answerInput.trim()}>
                                        Submit
                                    </button>
                                </form>
                            ) : (
                                <div className="daily-answers">
                                    <div className="answer-block my-answer">
                                        <strong>You:</strong> {questionStatus.myAnswer}
                                    </div>
                                    <div className="answer-block partner-answer">
                                        <strong>{otherUserName}:</strong> 
                                        {questionStatus.bothAnswered 
                                            ? ` ${questionStatus.partnerAnswer || 'Waiting...'}`
                                            : (questionStatus.partnerHasAnswered ? " 🔒 (Answered!)" : " ⏳ (Waiting...)")
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="empty-chat">
                        <Heart size={48} style={{color: 'var(--primary)', opacity: 0.3}} />
                        <p>Start the conversation! 💕</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.sender_id === userId ? 'sent' : 'received'}`}>
                            <div className="message-bubble">
                                {msg.message_text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="message-input-form">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Say something..."
                    className="message-input"
                />
                <button type="submit" disabled={!inputText.trim()} className="send-btn">
                    <Send size={20} />
                </button>
            </form>
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
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            if (profilePhoto) {
                // If a new photo was selected, upload it
                const photoFormData = new FormData();
                photoFormData.append('profile_photo', profilePhoto);
                
                const photoRes = await fetch(`${API_URL}/api/users/profile-photo`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: photoFormData
                });

                const photoData = await photoRes.json();
                if (photoData.success) {
                    formData.profile_photo_url = photoData.photo_url;
                } else {
                    alert('Error uploading photo: ' + (photoData.error || 'Unknown error'));
                    setIsLoading(false);
                    return;
                }
            }

            // Update the rest of the profile
            const response = await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    display_name: formData.display_name,
                    bio: formData.bio,
                    profile_photo_url: formData.profile_photo_url
                })
            });

            const data = await response.json();
            if (data.success) {
                setIsEditing(false);
                setProfilePhoto(null);
                alert('Profile updated successfully!');
            } else {
                alert('Error updating profile: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page profile-page">
            <div className="page-header">
                <h2>Profile Settings</h2>
            </div>
            <div className="profile-card">
                <div className="profile-header">
                    <img 
                        src={profilePhoto ? URL.createObjectURL(profilePhoto) : (formData.profile_photo_url || `https://api.dicebear.com/6.x/initials/svg?seed=${user.username}`)} 
                        alt="profile" 
                        className="profile-photo"
                    />
                    <div>
                        <h2>{user.display_name}</h2>
                        <p>@{user.username}</p>
                    </div>
                </div>

                <div className="profile-form">
                    <div className="form-group">
                        <label>Display Name</label>
                        <input
                            type="text"
                            name="display_name"
                            className="input-premium"
                            value={formData.display_name}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="form-group">
                        <label>Bio</label>
                        <textarea
                            name="bio"
                            className="input-premium"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Tell us about yourself..."
                            rows="4"
                            disabled={!isEditing}
                        />
                    </div>

                    {isEditing && (
                        <div className="form-group">
                            <label>Profile Photo</label>
                            <input 
                                type="file" 
                                id="profile-photo-upload"
                                onChange={handlePhotoChange} 
                                accept="image/*" 
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="profile-photo-upload" className={`upload-area ${profilePhoto ? 'has-file' : ''}`}>
                                <div className={`upload-area-content ${profilePhoto ? 'has-file' : ''}`}>
                                    {profilePhoto ? (
                                        <>
                                            <CheckCircle size={32} />
                                            <p>{profilePhoto.name}</p>
                                            <span>Click to change photo</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={32} />
                                            <p>Click to Take Photo or Upload</p>
                                            <span>Supports Camera & Gallery</span>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>
                    )}
                    
                    <div className="profile-actions">
                        {isEditing ? (
                            <>
                                <button className="btn-premium" style={{background: 'var(--glass-border)'}} onClick={() => {
                                    setIsEditing(false);
                                    setProfilePhoto(null);
                                }} disabled={isLoading}>Cancel</button>
                                <button className="btn-premium" onClick={handleSave} disabled={isLoading}>
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button className="btn-premium" onClick={() => setIsEditing(true)}>Edit Profile</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SHARED CARDS & COMPONENTS
// ============================================================================

function UserCard({ user, token, showNotification }) {
    const [status, setStatus] = useState(user.crush_status); // 'not_crushed', 'declared', 'mutual'
    const [loading, setLoading] = useState(false);

    const handleDeclare = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/crushes/declare`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ crush_username: user.username })
            });
            const result = await res.json();
            console.log('Crush declaration response:', result);
            
            if (result.success) {
                const crushStatus = result.crush?.crush_status || 'pending';
                setStatus(crushStatus === 'mutual' ? 'mutual' : 'declared');
                
                let message = result.message || 'Crush declared!';
                let notificationType = 'info';
                
                // Use crush_status from backend to determine message
                if (crushStatus === 'mutual') {
                    message = `🎉 It's a mutual match with ${user.display_name}!`;
                    notificationType = 'success';
                } else if (crushStatus === 'already_matched') {
                    message = `${user.display_name} is already committed to someone else! 💔`;
                    notificationType = 'error';
                } else if (crushStatus === 'crushing_on_someone_else') {
                    message = `${user.display_name} has a crush on someone else. 😢`;
                    notificationType = 'error';
                } else if (crushStatus === 'no_crush_declared') {
                    message = `${user.display_name} hasn't declared a crush yet. 💌`;
                    notificationType = 'info';
                } else {
                    message = `💌 Crush declared! Waiting for their response...`;
                }
                
                showNotification(message, notificationType);
            } else {
                showNotification(result.error || 'Failed to declare crush', 'error');
            }
        } catch (err) {
            console.error('Declare error:', err);
            showNotification('Connection error', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="user-card">
            <img src={user.profile_photo_url || `https://api.dicebear.com/6.x/initials/svg?seed=${user.username}`} alt={user.display_name} className="card-image" />
            <div className="card-content">
                <h3>{user.display_name}</h3>
                <p>@{user.username}</p>
                
                <div className="card-footer">
                    {status === 'mutual' ? (
                        <span className="badge mutual">Mutual Crush!</span>
                    ) : status === 'declared' ? (
                        <span className="badge declared">Declared</span>
                    ) : (
                        <button className="btn-premium" onClick={handleDeclare} disabled={loading}>
                            {loading ? '...' : 'Declare Crush'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function CrushCard({ crush }) {
    const isMutual = crush.crush_status === 'mutual';
    return (
        <div className="crush-card">
            <img src={crush.profile_photo_url || `https://api.dicebear.com/6.x/initials/svg?seed=${crush.crush_username}`} alt={crush.crush_display_name} className="card-image" />
            <div className="card-content">
                <h3>{crush.crush_display_name}</h3>
                <p>@{crush.crush_username}</p>
                <div className="card-footer">
                    <span className={`badge ${isMutual ? 'mutual' : 'pending'}`}>
                        {isMutual ? 'Matched!' : 'Pending Match'}
                    </span>
                    <small style={{color: 'var(--text-muted)'}}>Declared on {new Date(crush.declared_at).toLocaleDateString()}</small>
                </div>
            </div>
        </div>
    );
}

function MatchCard({ match, onChatClick }) {
    return (
        <div className="match-card">
            <img src={match.profile_photo_url || `https://api.dicebear.com/6.x/initials/svg?seed=${match.username}`} alt={match.display_name} className="card-image" />
            <div className="card-content">
                <h3>{match.display_name}</h3>
                <p>@{match.username}</p>
                <div className="card-footer">
                    <span className="badge mutual">Matched!</span>
                    {onChatClick && (
                        <button className="btn-chat" onClick={onChatClick} title="Chat" style={{marginLeft: '10px', fontSize: '0.9rem', display: 'flex', gap: '5px', padding: '5px 15px', borderRadius: '20px', width: 'auto', height: 'auto'}}>
                            <MessageCircle size={18} /> Chat
                        </button>
                    )}
                    <small style={{color: 'var(--text-muted)'}}>Matched on {new Date(match.mutual_at || match.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon, message, submessage }) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h3>{message}</h3>
            <p>{submessage}</p>
        </div>
    );
}

// ============================================================================
// FLOATING HEARTS COMPONENT
// ============================================================================

function FloatingHearts() {
    return (
        <div className="floating-hearts">
            <div className="heart">❤️</div>
            <div className="heart">💜</div>
            <div className="heart">❤️</div>
            <div className="heart">💜</div>
            <div className="heart">❤️</div>
            <div className="heart">💜</div>
            <div className="heart">❤️</div>
            <div className="heart">💜</div>
            <div className="heart">❤️</div>
        </div>
    );
}

export default App;

/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useState, useEffect } from 'react';
import './index.css';
import { Heart, LogOut, User, ShieldCheck, Mail, Lock, UserPlus, LogIn, ChevronRight, CheckCircle, Clock, Trash2, ShieldAlert } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('login');
    const [token, setToken] = useState(localStorage.getItem('accessToken'));
    const [appLoading, setAppLoading] = useState(!!localStorage.getItem('accessToken'));

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
            <header className="header glass-card" style={{ margin: '20px', borderRadius: '16px', padding: '10px 30px' }}>
                <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="logo-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Heart className="primary-color" fill="#ff3366" size={28} />
                        <h1 className="logo" style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px' }}>CrushDetector</h1>
                    </div>
                    {currentUser && currentUser.is_email_verified && (
                        <div className="user-section" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <span className="welcome-text" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <User size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                {currentUser.display_name}
                            </span>
                            <button className="logout-btn" onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <LogOut size={18} />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="main-content" style={{ padding: '0 20px' }}>
                {appLoading ? (
                    <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                        <Heart className="loading-heart" fill="#ff3366" size={48} style={{ marginBottom: '20px' }} />
                        <p style={{ color: 'var(--text-muted)' }}>Preparing your heart...</p>
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
                    />
                )}
            </main>
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
                setSuccess('✅ Account verified!');
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
        <div className="auth-container fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
            <div className="auth-card glass-card" style={{ maxWidth: '450px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ background: 'var(--primary-glow)', width: '70px', height: '70px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Mail className="primary-color" size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '10px' }}>Verify your email</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>We sent a 6-digit code to<br /><strong style={{ color: 'var(--text-main)' }}>{email}</strong></p>
                </div>

                {error && <div className="error-message glass-card" style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '12px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(255, 59, 48, 0.2)' }}>{error}</div>}
                {success && <div className="success-message glass-card" style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34c759', padding: '12px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(52, 199, 89, 0.2)' }}>{success}</div>}

                <form onSubmit={handleVerify}>
                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="input-premium"
                            maxLength={6}
                            style={{ fontSize: '32px', letterSpacing: '12px', textAlign: 'center', fontWeight: '700' }}
                            autoFocus
                            required
                        />
                    </div>
                    <button type="submit" className="btn-premium" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify Account'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Didn't receive it?{' '}
                        {resendCooldown > 0 ? (
                            <span style={{ fontWeight: '600' }}>Retry in {resendCooldown}s</span>
                        ) : (
                            <button onClick={handleResend} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Resend code</button>
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
        <div className="auth-container fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
            <div className="auth-card glass-card" style={{ maxWidth: '450px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '10px' }}>Welcome Back</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Find out if your crush likes you back</p>
                </div>

                {error && <div className="error-message glass-card" style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '12px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input-premium"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                                style={{ paddingLeft: '48px' }}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '30px' }}>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="input-premium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                style={{ paddingLeft: '48px' }}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-premium" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Entering...' : 'Login to Dashboard'}
                        <LogIn size={18} />
                    </button>
                </form>

                <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Don't have an account? <button onClick={onSwitchPage} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}>Create one now</button>
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
        <div className="auth-container fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
            <div className="auth-card glass-card" style={{ maxWidth: '550px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '10px' }}>Join the Circle</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Find out who likes you back!</p>
                </div>

                {error && <div className="error-message glass-card" style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '12px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleRegister}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <input type="text" name="username" className="input-premium" value={formData.username} onChange={handleChange} placeholder="Username" required />
                        <input type="text" name="display_name" className="input-premium" value={formData.display_name} onChange={handleChange} placeholder="Full Name" required />
                    </div>

                    <input type="email" name="email" className="input-premium" value={formData.email} onChange={handleChange} placeholder="Email Address" style={{ marginBottom: '20px' }} required />
                    <input type="password" name="password" className="input-premium" value={formData.password} onChange={handleChange} placeholder="Password (min 8 chars)" style={{ marginBottom: '20px' }} required />

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Date of Birth</label>
                        <input type="date" name="date_of_birth" className="input-premium" value={formData.date_of_birth} onChange={handleChange} />
                    </div>

                    <button type="submit" className="btn-premium" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Processing...' : 'Create Account'}
                        <ChevronRight size={18} />
                    </button>
                </form>

                <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Already a member? <button onClick={onSwitchPage} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}>Sign In</button>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// REAPPLY MODAL
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass-card fade-in" style={{ maxWidth: '500px', width: '100%', padding: '40px', position: 'relative', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ background: 'rgba(255, 51, 102, 0.1)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <ShieldCheck className="primary-color" size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '10px' }}>{isInitial ? 'Identity Verification' : 'Re-submit Verification'}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload your Student ID to access all features.</p>
                </div>
                
                {error && <div style={{ color: '#ff3b30', background: 'rgba(255, 59, 48, 0.1)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(255, 59, 48, 0.2)' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>College/University Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Stanford University" 
                            className="input-premium" 
                            value={formData.college_name} 
                            onChange={e => setFormData({...formData, college_name: e.target.value})} 
                            required 
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '500' }}>Student ID Card Photo</label>
                        
                        <input 
                            type="file" 
                            id="student-id-upload"
                            onChange={e => setIdPhoto(e.target.files[0])} 
                            accept="image/*" 
                            style={{ position: 'absolute', width: '100px', height: '0', opacity: 0, pointerEvents: 'none' }}
                        />
                        
                        <label 
                            htmlFor="student-id-upload"
                            style={{ 
                                display: 'block',
                                border: '2px dashed var(--glass-border)', 
                                borderRadius: '16px', 
                                padding: '30px 20px', 
                                textAlign: 'center', 
                                cursor: 'pointer',
                                background: idPhoto ? 'rgba(52, 199, 89, 0.05)' : 'rgba(255,255,255,0.02)',
                                transition: 'all 0.3s ease',
                                borderColor: idPhoto ? '#34c759' : 'var(--glass-border)'
                            }}
                        >
                            {idPhoto ? (
                                <div style={{ color: '#34c759' }}>
                                    <CheckCircle size={32} style={{ marginBottom: '10px' }} />
                                    <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>{idPhoto.name}</p>
                                    <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Click to change photo</p>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-muted)' }}>
                                    <UserPlus size={32} style={{ marginBottom: '10px' }} />
                                    <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>Click to Take Photo or Upload</p>
                                    <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Supports Camera & Gallery</p>
                                </div>
                            )}
                        </label>
                    </div>

                    <button type="submit" className="btn-premium" style={{ width: '100%', height: '55px', fontSize: '1rem' }} disabled={loading}>
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


function DashboardPage({ user, token, setCurrentPage, currentPage }) {
    const [showReapplyModal, setShowReapplyModal] = useState(false);

    return (
        <div className="dashboard-layout" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px', padding: '20px' }}>
            {showReapplyModal && (
                <VerificationModal 
                    token={token} 
                    isInitial={!user.verification_status}
                    onClose={() => setShowReapplyModal(false)} 
                    onSuccess={() => {
                        setShowReapplyModal(false);
                        window.location.reload();
                    }} 
                />
            )}

            <aside className="glass-card" style={{ height: 'calc(100vh - 120px)', padding: '20px', position: 'sticky', top: '100px', borderRadius: '24px' }}>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <NavBtn active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} icon={<Heart size={18} />} label="Discover" />
                    <NavBtn active={currentPage === 'search'} onClick={() => setCurrentPage('search')} icon={<UserPlus size={18} />} label="Add Crush" />
                    <NavBtn active={currentPage === 'crushes'} onClick={() => setCurrentPage('crushes')} icon={<Clock size={18} />} label="My Crushes" />
                    <NavBtn active={currentPage === 'matches'} onClick={() => setCurrentPage('matches')} icon={<Heart size={18} fill={currentPage === 'matches' ? 'currentColor' : 'none'} />} label="Matches" />
                    <NavBtn active={currentPage === 'profile'} onClick={() => setCurrentPage('profile')} icon={<User size={18} />} label="Settings" />
                </nav>

                {!user.is_identity_verified && (
                    <div style={{ marginTop: 'auto', padding: '15px', borderRadius: '16px', background: user.verification_status === 'rejected' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 193, 7, 0.1)', border: `1px solid ${user.verification_status === 'rejected' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 193, 7, 0.2)'}`, color: user.verification_status === 'rejected' ? '#ff3b30' : '#ffc107' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                            {user.verification_status === 'rejected' ? <ShieldAlert size={16} /> : <Clock size={16} />}
                            <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>
                                {user.verification_status === 'rejected' ? 'Verification Rejected' : user.verification_status === 'pending' ? 'Verification Pending' : 'Verify Identity'}
                            </span>
                        </div>
                        <p style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '10px' }}>
                            {user.verification_status === 'rejected' 
                                ? 'Your ID was not approved. Please re-apply with a clearer photo.' 
                                : user.verification_status === 'pending'
                                ? `We're reviewing your ${user.verification_type} ID.`
                                : 'Verify your student ID to declare crushes and see matches.'}
                        </p>
                        {(user.verification_status === 'rejected' || !user.verification_status) && (
                            <button 
                                onClick={() => setShowReapplyModal(true)}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', background: user.verification_status === 'rejected' ? '#ff3b30' : 'var(--primary)', color: 'white', border: 'none', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                                {user.verification_status === 'rejected' ? 'Re-apply Now' : 'Verify Now'}
                            </button>
                        )}
                    </div>
                )}

            </aside>

            <main className="dashboard-content fade-in">
                {currentPage === 'dashboard' && <HomePage user={user} token={token} />}
                {currentPage === 'search' && <SearchPage token={token} />}
                {currentPage === 'crushes' && <CrushesPage token={token} />}
                {currentPage === 'matches' && <MatchesPage token={token} />}
                {currentPage === 'profile' && <ProfilePage user={user} token={token} />}
            </main>
        </div>
    );
}

function NavBtn({ active, onClick, icon, label }) {
    return (
        <button 
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer', transition: 'var(--transition)',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'white' : 'var(--text-muted)',
                fontWeight: active ? '600' : '400',
                width: '100%', textAlign: 'left'
            }}
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
            <div className="hero-section" style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px' }}>Hello, {user.display_name.split(' ')[0]}!</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Here's what's happening with your crushes today.</p>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '50px' }}>
                <StatCard icon={<Heart size={24} />} label="My Crushes" value={stats.crushes} color="var(--primary)" />
                <StatCard icon={<Heart size={24} fill="currentColor" />} label="Mutual Matches" value={stats.mutual_matches} color="#7000ff" />
                <StatCard icon={<User size={24} />} label="Profile Views" value={stats.profile_views} color="#00d4ff" />
            </div>

            <section className="recent-matches">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Recent Matches</h2>
                </div>
                {recentMatches.length > 0 ? (
                    <div className="matches-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {recentMatches.map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: '60px', textAlign: 'center', borderRadius: '24px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Heart size={30} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <h3 style={{ marginBottom: '10px' }}>No matches yet</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Start searching and declaring your crushes to find a match!</p>
                    </div>
                )}
            </section>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="glass-card" style={{ padding: '25px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: color, opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)' }}></div>
            <div style={{ color: color, marginBottom: '15px' }}>{icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '5px' }}>{value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>{label}</div>
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
        <div className="page search-page fade-in">
            <div className="search-header" style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '10px' }}>Find Your Person</h2>
                <p style={{ color: 'var(--text-muted)' }}>Search by name or username to declare your interest.</p>
            </div>

            <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: '40px' }}>
                <UserPlus size={20} style={{ position: 'absolute', left: '20px', top: '22px', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Who are you looking for?"
                    className="input-premium"
                    style={{ paddingLeft: '55px', height: '65px', fontSize: '1.1rem' }}
                />
                <button type="submit" className="btn-premium" style={{ position: 'absolute', right: '10px', top: '10px', height: '45px' }} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {message && <div className="glass-card" style={{ padding: '20px', textAlign: 'center', marginBottom: '30px', color: 'var(--text-muted)' }}>{message}</div>}

            <div className="search-results" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
                {searchResults.map(user => (
                    <UserCard key={user.id} user={user} token={token} />
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
        <div className="page crushes-page fade-in">
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '10px' }}>Sent Declarations</h2>
                <p style={{ color: 'var(--text-muted)' }}>Your declarations are private until matched. 🔒</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}><Clock className="loading-heart" /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
                    {crushes.length > 0 ? (
                        crushes.map(crush => (
                            <CrushCard key={crush.id} crush={crush} />
                        ))
                    ) : (
                        <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center' }}>
                            <Heart size={40} style={{ color: 'var(--text-muted)', marginBottom: '15px' }} />
                            <h3>No active crushes</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Go to Search to declare your first crush!</p>
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
                setMessage('💘 Declaration Sent!');
                setTimeout(() => setMessage(''), 3000);
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
        <div className="glass-card fade-in" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    {user.profile_photo_url ? (
                        <img src={user.profile_photo_url} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <User size={24} />
                        </div>
                    )}
                </div>
                <div>
                    <h3 style={{ fontWeight: '700', fontSize: '1.1rem' }}>{user.display_name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{user.username}</p>
                </div>
            </div>
            
            {user.bio && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{user.bio}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
                {!user.is_identity_verified && <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,193,7,0.1)', color: '#ffc107', fontSize: '0.7rem', fontWeight: '600' }}>Unverified</span>}
                {user.you_have_crush_on_them && <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(52,199,89,0.1)', color: '#34c759', fontSize: '0.7rem', fontWeight: '600' }}>Active Crush</span>}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--glass-border)' }}>
                {user.you_have_crush_on_them ? (
                    <button className="input-premium" disabled style={{ width: '100%', color: 'var(--primary)', borderColor: 'var(--primary)', cursor: 'default' }}>
                        <CheckCircle size={16} />
                        <span>Declared</span>
                    </button>
                ) : (
                    <button className="btn-premium" onClick={handleDeclareCrush} disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Sending...' : 'Declare Crush'}
                    </button>
                )}
            </div>
            {message && <p style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--primary)', fontWeight: '600' }}>{message}</p>}
        </div>
    );
}

function MatchCard({ match }) {
    return (
        <div className="glass-card fade-in" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '22px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                {match.profile_photo_url ? (
                    <img src={match.profile_photo_url} alt={match.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={30} /></div>
                )}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: '700' }}>{match.display_name}</h3>
                    <Heart size={20} fill="var(--primary)" color="var(--primary)" />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{match.username}</p>
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Matched on {new Date(match.mutual_at).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
}

function CrushCard({ crush }) {
    const getStatusColor = (status) => {
        if (status === 'mutual') return '#34c759';
        if (status === 'already_matched') return '#ff3b30';
        return '#ff9500';
    };

    return (
        <div className="glass-card fade-in" style={{ padding: '25px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Heart size={24} color={getStatusColor(crush.crush_status)} />
                </div>
                <div>
                    <h3 style={{ fontWeight: '700' }}>{crush.crush_display_name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>@{crush.crush_username}</p>
                </div>
            </div>
            
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Status</div>
                <div style={{ color: getStatusColor(crush.crush_status), fontWeight: '700', fontSize: '0.9rem' }}>
                    {crush.crush_status === 'mutual' ? 'MATCHED' : crush.crush_status.replace(/_/g, ' ').toUpperCase()}
                </div>
            </div>
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

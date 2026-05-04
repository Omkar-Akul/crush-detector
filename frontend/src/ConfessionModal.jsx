import React, { useState, useEffect } from 'react';
import { X, PenTool, ArrowLeft } from 'lucide-react';
import './ConfessionModal.css';

export default function ConfessionModal({ isOpen, onClose, token, API_URL }) {
    const [view, setView] = useState('read'); // 'read' or 'write'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [confessions, setConfessions] = useState([]);
    const [loadingConfessions, setLoadingConfessions] = useState(true);

    useEffect(() => {
        if (isOpen && view === 'read') {
            fetchConfessions();
        }
    }, [isOpen, view]);

    // Reset view when modal is closed/opened
    useEffect(() => {
        if (isOpen) {
            setView('read');
            setMessage('');
            setTitle('');
            setContent('');
        }
    }, [isOpen]);

    const fetchConfessions = async () => {
        setLoadingConfessions(true);
        try {
            const response = await fetch(`${API_URL}/api/confessions`);
            const data = await response.json();
            if (data.success) {
                setConfessions(data.confessions);
            }
        } catch (error) {
            console.error('Error fetching confessions:', error);
        } finally {
            setLoadingConfessions(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim() || !content.trim()) {
            setMessage('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/confessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, content })
            });

            const data = await response.json();

            if (data.success) {
                setMessage('✅ Confession submitted! Admin will review it soon.');
                setTitle('');
                setContent('');
                setTimeout(() => {
                    setView('read');
                    setMessage('');
                }, 2000);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="confession-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-left">
                        {view === 'write' && (
                            <button className="back-btn" onClick={() => setView('read')}>
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2>{view === 'write' ? '💭 Write Confession' : '💭 Confessions'}</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {view === 'read' ? (
                    <div className="confession-list-container">
                        {loadingConfessions ? (
                            <div className="loading">Loading confessions...</div>
                        ) : confessions.length > 0 ? (
                            <div className="confession-list">
                                {confessions.map(conf => (
                                    <div key={conf.id} className="confession-item">
                                        <h3>{conf.title}</h3>
                                        <p>{conf.content}</p>
                                        <small>{new Date(conf.created_at).toLocaleDateString()}</small>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">No approved confessions yet. Be the first to share!</div>
                        )}
                        
                        <button className="floating-write-btn" onClick={() => setView('write')} title="Write a confession">
                            <PenTool size={24} />
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="confession-form">
                        <div className="form-group">
                            <label>Title *</label>
                            <input
                                type="text"
                                placeholder="Give your confession a title..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={200}
                                required
                            />
                            <small>{title.length}/200</small>
                        </div>

                        <div className="form-group">
                            <label>Your Confession *</label>
                            <textarea
                                placeholder="Share your thoughts, feelings, or confession... (anonymous)"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                maxLength={2000}
                                rows={8}
                                required
                            />
                            <small>{content.length}/2000</small>
                        </div>

                        <div className="anon-notice">
                            🔒 Your confession is anonymous. Only admins can see your identity.
                        </div>

                        {message && (
                            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                                {message}
                            </div>
                        )}

                        <div className="form-actions">
                            <button type="submit" className="btn-submit" disabled={isLoading}>
                                {isLoading ? 'Submitting...' : 'Submit Confession'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

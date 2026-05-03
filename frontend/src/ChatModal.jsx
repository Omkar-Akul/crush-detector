import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { X, Send } from 'lucide-react';
import './ChatModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ChatModal({ match, token, userId, onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    // Auto-scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Fetch chat history
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
            }
        };

        fetchHistory();

        // Connect to WebSocket
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

        const otherUserId = match.user_1_id === userId ? match.user_2_id : match.user_1_id;

        socketRef.current.emit('send_message', {
            matchId: match.id,
            receiverId: otherUserId,
            messageText: inputText.trim()
        });

        setInputText('');
    };

    return (
        <div className="chat-modal-overlay">
            <div className="chat-modal">
                <div className="chat-header">
                    <img 
                        src={match.profile_photo_url || `https://api.dicebear.com/6.x/initials/svg?seed=${match.username}`} 
                        alt="Profile" 
                        className="chat-avatar"
                    />
                    <div className="chat-info">
                        <h3>{match.display_name}</h3>
                        <p>{isConnected ? '🟢 Online' : '🔴 Reconnecting...'}</p>
                    </div>
                    <button className="btn-close" onClick={onClose}><X size={24} /></button>
                </div>
                
                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="chat-empty">Send a message to start chatting! 💕</div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`chat-bubble ${msg.sender_id === userId ? 'sent' : 'received'}`}>
                                <div className="chat-text">{msg.message_text}</div>
                                <div className="chat-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSendMessage}>
                    <input 
                        type="text" 
                        placeholder="Type a message..." 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <button type="submit" className="btn-send"><Send size={20} /></button>
                </form>
            </div>
        </div>
    );
}

export default ChatModal;

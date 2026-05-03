import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { X, Send, Flame } from 'lucide-react';
import './ChatModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ChatModal({ match, token, userId, onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    
    // Daily Question State
    const [dailyQuestion, setDailyQuestion] = useState(null);
    const [questionStatus, setQuestionStatus] = useState(null);
    const [answerInput, setAnswerInput] = useState('');
    const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
    const [isGameExpanded, setIsGameExpanded] = useState(false);

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
        // Fetch Daily Question
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
                        setIsGameExpanded(true); // Auto-expand if I haven't answered
                    }
                }
            } catch (error) {
                console.error("Failed to load daily question:", error);
            }
        };

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
        fetchDailyQuestion();

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
                    bothAnswered: prev.partnerHasAnswered,
                    // Reveal partner's answer if they already answered
                    partnerAnswer: prev.partnerHasAnswered ? "Please refresh to see partner's answer" : null // They might want to see it live, but refresh is fine or we can assume we don't have it locally. Actually let's just let them refresh or we can fetch again
                }));
                setAnswerInput('');
                
                // Refetch to get partner's answer if both answered
                if (questionStatus.partnerHasAnswered) {
                     const fetchDailyQuestion = async () => {
                        const res = await fetch(`${API_URL}/api/games/daily-question/${match.id}`, { headers: { 'Authorization': `Bearer ${token}` }});
                        const qData = await res.json();
                        if(qData.success) setQuestionStatus(qData.status);
                     };
                     fetchDailyQuestion();
                }
            }
        } catch (error) {
            console.error("Failed to submit answer:", error);
        } finally {
            setIsSubmittingAnswer(false);
        }
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
                    {questionStatus && questionStatus.streak > 0 && (
                        <div className="streak-badge" title={`Daily Couple Streak: ${questionStatus.streak}`}>
                            <Flame size={18} color="#FF4500" />
                            <span>{questionStatus.streak}</span>
                        </div>
                    )}
                    <button className="btn-close" onClick={onClose}><X size={24} /></button>
                </div>
                
                {dailyQuestion && questionStatus && (
                    <div className="daily-game-banner">
                        <div className="daily-game-header" onClick={() => setIsGameExpanded(!isGameExpanded)}>
                            <h4>🌟 Daily Couple Question 🌟</h4>
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
                                            <strong>{match.display_name}:</strong> 
                                            {questionStatus.bothAnswered 
                                                ? ` ${questionStatus.partnerAnswer || 'Refreshing...'}`
                                                : (questionStatus.partnerHasAnswered ? " 🔒 (Answered! Reveal by answering!)" : " ⏳ (Waiting for answer...)")
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

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

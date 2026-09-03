import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { Loader2, Send, MoreVertical, Ban, Flag, Trash2 } from 'lucide-react';
import TopBar from '../components/TopBar';

const getDisplayName = (user) => {
    if (!user) return 'Unknown User';
    return (user.showBreederName && user.breederName) ? user.breederName : (user.showPersonalName ? user.personalName : `User ${user.id_public}`);
};

// Message thread for a single conversation — mirrors crittertrack-frontend's MessagesView.jsx
// chat pane, as its own pushed page. Text-only for now (no image attachments in this pass).
const MessageThread = ({ userProfile }) => {
    const { otherUserId } = useParams();
    const navigate = useNavigate();
    const [otherUser, setOtherUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const messagesEndRef = useRef(null);
    const prevCountRef = useRef(0);

    const fetchMessages = useCallback(async () => {
        try {
            const response = await apiClient.get(`/messages/conversation/${otherUserId}`);
            setMessages(response.data?.messages || []);
            if (response.data?.otherUser) setOtherUser(response.data.otherUser);
            window.dispatchEvent(new Event('messages-changed'));
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    }, [otherUserId]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);
    useEffect(() => {
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        if (messages.length > prevCountRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevCountRef.current = messages.length;
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        const text = newMessage.trim();
        if (!text || sending) return;
        setSending(true);
        try {
            await apiClient.post('/messages/send', { receiverId: otherUserId, message: text, images: [] });
            setNewMessage('');
            await fetchMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleBlock = async () => {
        if (!window.confirm(`Block ${getDisplayName(otherUser)}? They won't be able to message you.`)) return;
        try {
            await apiClient.post(`/messages/block/${otherUserId}`, {});
            navigate('/messages');
        } catch (error) {
            console.error('Failed to block user:', error);
        }
    };

    const handleReport = async () => {
        const reason = window.prompt('Why are you reporting this conversation? (max 1000 characters)');
        if (!reason) return;
        try {
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            const recentMessages = messages
                .filter((m) => new Date(m.createdAt).getTime() > twentyFourHoursAgo)
                .map((m) => ({ messageId: m._id, senderId: m.senderId, message: m.message, createdAt: m.createdAt }));
            await apiClient.post('/reports/message', {
                conversationUserId: otherUserId, reportedUserId: otherUserId,
                reason: reason.trim().slice(0, 1000), recentMessages,
            });
            window.alert('Report submitted to the support team.');
        } catch (error) {
            console.error('Failed to submit report:', error);
        }
    };

    const handleDeleteConversation = async () => {
        if (!window.confirm('Delete entire conversation? This cannot be undone.')) return;
        try {
            await apiClient.delete(`/messages/conversation/${otherUserId}`);
            navigate('/messages');
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const myId = String(userProfile?._id || '');

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg flex flex-col">
            <TopBar
                title={getDisplayName(otherUser)}
                onBack={() => navigate('/messages')}
                right={
                    <div className="relative">
                        <button onClick={() => setShowMenu((v) => !v)} className="p-1.5 rounded-full bg-white/20"><MoreVertical size={18} /></button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-dark-card-bg rounded-lg shadow-lg overflow-hidden z-30 w-44 text-sm">
                                <button onClick={() => { setShowMenu(false); handleBlock(); }} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-surface">
                                    <Ban size={14} /> Block user
                                </button>
                                <button onClick={() => { setShowMenu(false); handleReport(); }} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-surface">
                                    <Flag size={14} /> Report conversation
                                </button>
                                <button onClick={() => { setShowMenu(false); handleDeleteConversation(); }} className="w-full flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-dark-surface">
                                    <Trash2 size={14} /> Delete conversation
                                </button>
                            </div>
                        )}
                    </div>
                }
            />
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : messages.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-dark-text-muted text-sm py-16">Say hello 👋</p>
                ) : (
                    messages.map((m) => {
                        const isMine = String(m.senderId) === myId;
                        return (
                            <div key={m._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMine ? 'bg-accent dark:bg-dark-accent text-white' : 'bg-white dark:bg-dark-card-bg text-gray-800 dark:text-dark-text shadow-sm'}`}>
                                    {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                                    <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/70' : 'text-gray-400 dark:text-dark-text-muted'}`}>
                                        {new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white dark:bg-dark-card-bg border-t border-gray-100 dark:border-dark-border flex items-center gap-2">
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-full bg-gray-100 dark:bg-dark-surface text-sm text-gray-900 dark:text-dark-text outline-none"
                />
                <button type="submit" disabled={sending || !newMessage.trim()} className="p-2.5 rounded-full bg-accent dark:bg-dark-accent text-white disabled:opacity-50 flex-shrink-0">
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </form>
        </div>
    );
};

export default MessageThread;

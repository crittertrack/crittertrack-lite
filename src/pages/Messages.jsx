import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { Loader2, MessageCircle, User } from 'lucide-react';
import TopBar from '../components/TopBar';

const getDisplayName = (user) => {
    if (!user) return 'Unknown User';
    return (user.showBreederName && user.breederName) ? user.breederName : (user.showPersonalName ? user.personalName : `User ${user.id_public}`);
};

const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
    if (diffInHours < 168) return date.toLocaleDateString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
};

// Conversation list — mirrors crittertrack-frontend's MessagesView.jsx conversation pane, as
// its own page (Lite is page-based, not modal-based). Tapping a conversation pushes the thread.
const Messages = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await apiClient.get('/messages/conversations');
            setConversations(response.data || []);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <TopBar title="Messages" onBack={() => navigate(-1)} />
            <div className="px-4 pt-3">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : conversations.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-dark-text-muted">
                        <MessageCircle size={40} className="mx-auto mb-2 text-gray-300 dark:text-dark-border" />
                        <p className="text-sm">No conversations yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conversations.map((conv) => (
                            <button
                                key={conv.conversationId}
                                onClick={() => navigate(`/messages/${conv.otherUserId}`)}
                                className="w-full flex items-center gap-3 bg-white dark:bg-dark-card-bg rounded-xl p-2.5 shadow-sm text-left"
                            >
                                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-dark-surface flex items-center justify-center">
                                    {conv.otherUser?.profileImage ? (
                                        <img src={conv.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={18} className="text-gray-400 dark:text-dark-text-muted" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline gap-2">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{getDisplayName(conv.otherUser)}</p>
                                        {conv.unreadCount > 0 && (
                                            <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">{conv.unreadCount}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">{conv.lastMessage}</p>
                                </div>
                                <span className="text-[11px] text-gray-400 dark:text-dark-text-muted flex-shrink-0">{formatTime(conv.lastMessageDate)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;

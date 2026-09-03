import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Search, Bell, MessageCircle } from 'lucide-react';
import logo from '../assets/lite-logo.png';
import { useAlertCount } from '../hooks/useAlertCount';
import { useRequestCount } from '../hooks/useRequestCount';
import { useMessageUnreadCount } from '../hooks/useMessageUnreadCount';
import AnimalImage from './shared/AnimalImage';

// App-wide brand bar shown above the per-page TopBar on all main tab screens. Top row is a
// full-width jump-to-search field; the bell now covers BOTH care-task alerts and account
// requests/updates (see Notifications.jsx tabs), messages gets its own icon, and logout lives
// on the Profile page now (tap the profile image to get there).
const BrandHeader = ({ userProfile, authToken }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const alertCount = useAlertCount(authToken);
    const requestCount = useRequestCount(authToken);
    const messageCount = useMessageUnreadCount(authToken);
    const bellCount = alertCount + requestCount;

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    };

    return (
        <header
            className="sticky top-0 z-30 bg-white dark:bg-dark-card-bg border-b border-gray-100 dark:border-dark-border shadow-sm"
            style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
        >
            <form onSubmit={handleSearchSubmit} className="px-4 pb-2">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-surface rounded-full px-3 py-2">
                    <Search size={16} className="text-gray-400 dark:text-dark-text-muted flex-shrink-0" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search public animals…"
                        className="flex-1 min-w-0 text-sm outline-none bg-transparent text-gray-900 dark:text-dark-text"
                    />
                </div>
            </form>
            <div className="flex items-center justify-between px-4 pb-2.5 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <img src={logo} alt="" className="w-9 h-9 rounded-md object-contain flex-shrink-0" />
                    <span className="text-base font-bold text-gray-800 dark:text-dark-text truncate">CritterTrack Lite</span>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted" title="Notifications">
                        <Bell size={18} />
                        {bellCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {bellCount > 9 ? '9+' : bellCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => navigate('/messages')} className="relative p-2 rounded-full bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted" title="Messages">
                        <MessageCircle size={18} />
                        {messageCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {messageCount > 9 ? '9+' : messageCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => navigate('/profile')} className="flex-shrink-0" title="Profile">
                        {userProfile?.profileImage ? (
                            <div className="w-9 h-9 rounded-full overflow-hidden">
                                <AnimalImage src={userProfile.profileImage} alt="Profile" iconSize={18} FallbackIcon={User} />
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-dark-surface flex items-center justify-center">
                                <User size={18} className="text-gray-400 dark:text-dark-text-muted" />
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default BrandHeader;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Search, Bell } from 'lucide-react';
import logo from '../assets/lite-logo.png';
import { useAlertCount } from '../hooks/useAlertCount';
import ThemeToggle from './ThemeToggle';

// App-wide brand bar shown above the per-page TopBar on all main tab screens.
const BrandHeader = ({ userProfile, onLogout, authToken }) => {
    const navigate = useNavigate();
    const alertCount = useAlertCount(authToken);
    return (
        <header
            className="sticky top-0 z-30 bg-white dark:bg-dark-card-bg flex items-center justify-between px-4 py-3 gap-3 border-b border-gray-100 dark:border-dark-border shadow-sm"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <img src={logo} alt="" className="w-9 h-9 rounded-md object-contain flex-shrink-0" />
                <span className="text-base font-bold text-gray-800 dark:text-dark-text truncate">CritterTrack Lite</span>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
                <ThemeToggle />
                <button onClick={() => navigate('/search')} className="p-2 rounded-full bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted" title="Search public animals">
                    <Search size={18} />
                </button>
                <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted" title="Notifications">
                    <Bell size={18} />
                    {alertCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {alertCount > 9 ? '9+' : alertCount}
                        </span>
                    )}
                </button>
                <button onClick={() => navigate('/profile')} className="flex-shrink-0" title="Profile">
                    {userProfile?.profileImage ? (
                        <img src={userProfile.profileImage} alt="Profile" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-dark-surface flex items-center justify-center">
                            <User size={18} className="text-gray-400 dark:text-dark-text-muted" />
                        </div>
                    )}
                </button>
                {onLogout && (
                    <button onClick={onLogout} className="p-2 rounded-full bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted" title="Log out">
                        <LogOut size={18} />
                    </button>
                )}
            </div>
        </header>
    );
};

export default BrandHeader;

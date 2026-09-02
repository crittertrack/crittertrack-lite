import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Search } from 'lucide-react';
import logo from '../assets/lite-logo.png';

// App-wide brand bar shown above the per-page TopBar on all main tab screens.
const BrandHeader = ({ userProfile, onLogout }) => {
    const navigate = useNavigate();
    return (
        <header
            className="sticky top-0 z-30 bg-white flex items-center justify-between px-4 py-3 gap-3 border-b border-gray-100 shadow-sm"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <img src={logo} alt="" className="w-9 h-9 rounded-md object-contain flex-shrink-0" />
                <span className="text-base font-bold text-gray-800 truncate">CritterTrack Lite</span>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
                <button onClick={() => navigate('/search')} className="p-2 rounded-full bg-gray-100 text-gray-500" title="Search public animals">
                    <Search size={18} />
                </button>
                {userProfile?.profileImage ? (
                    <img src={userProfile.profileImage} alt="Profile" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                        <User size={18} className="text-gray-400" />
                    </div>
                )}
                {onLogout && (
                    <button onClick={onLogout} className="p-2 rounded-full bg-gray-100 text-gray-500" title="Log out">
                        <LogOut size={18} />
                    </button>
                )}
            </div>
        </header>
    );
};

export default BrandHeader;

// Global "you're offline" indicator — mounted once at the app root (App.js) so it's
// visible across every screen regardless of auth state, including Login/Register.
import React from 'react';
import { WifiOff } from 'lucide-react';
import useOnlineStatus from '../hooks/useOnlineStatus';

const OfflineBanner = () => {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 dark:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 py-2 px-4 shadow-md"
            style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
        >
            <WifiOff size={14} />
            You're offline — some features may not work until your connection returns.
        </div>
    );
};

export default OfflineBanner;

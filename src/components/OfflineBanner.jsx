// Global "you're offline" indicator — mounted once at the app root (App.js) so it's
// visible across every screen regardless of auth state, including Login/Register.
// Deliberately `sticky` (not `fixed`): it needs to occupy real space in normal document flow
// so it pushes the page's own `sticky top-0` TopBar/BrandHeader down below it instead of the
// two overlapping at the same spot (which `fixed` positioning was causing).
import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import useOnlineStatus from '../hooks/useOnlineStatus';
import useQueuedWriteCount from '../hooks/useQueuedWriteCount';

const OfflineBanner = () => {
    const isOnline = useOnlineStatus();
    const queuedCount = useQueuedWriteCount();

    if (isOnline && queuedCount === 0) return null;

    return (
        <div
            className="sticky top-0 z-40 w-full bg-amber-500 dark:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 py-2 px-4 shadow-md"
            style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
        >
            {isOnline ? (
                <>
                    <RefreshCw size={14} className="animate-spin" />
                    Syncing {queuedCount} pending change{queuedCount === 1 ? '' : 's'}…
                </>
            ) : (
                <>
                    <WifiOff size={14} />
                    You're offline{queuedCount > 0 ? ` — ${queuedCount} change${queuedCount === 1 ? '' : 's'} will sync once you're back online.` : ' — some features may not work until your connection returns.'}
                </>
            )}
        </div>
    );
};

export default OfflineBanner;

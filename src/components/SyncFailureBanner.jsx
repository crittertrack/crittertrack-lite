// Surfaces offline-queued writes (see offlineQueue.js) that the server permanently rejected
// once synced — e.g. the record was changed or deleted in the meantime — so the change doesn't
// just vanish unseen. Mounted once at the app root, above BottomNav.
import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const SyncFailureBanner = () => {
    const [failures, setFailures] = useState([]);

    useEffect(() => {
        const onFailed = (e) => {
            setFailures((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...e.detail }]);
        };
        window.addEventListener('offline-write-failed', onFailed);
        return () => window.removeEventListener('offline-write-failed', onFailed);
    }, []);

    if (failures.length === 0) return null;

    const dismiss = (id) => setFailures((prev) => prev.filter((f) => f.id !== id));

    return (
        <div
            className="fixed left-3 right-3 z-50 space-y-2"
            style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        >
            {failures.map((f) => (
                <div key={f.id} className="bg-red-600 text-white text-xs font-semibold rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    <span className="flex-1">A change made while offline couldn't be synced — the record may have changed or been removed.</span>
                    <button onClick={() => dismiss(f.id)} className="flex-shrink-0"><X size={14} /></button>
                </div>
            ))}
        </div>
    );
};

export default SyncFailureBanner;

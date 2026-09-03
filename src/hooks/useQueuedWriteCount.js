// Tracks how many offline-queued writes (see offlineQueue.js) are waiting to sync, so UI (e.g.
// OfflineBanner) can tell the user their edits are safe and pending instead of just vanishing.
import { useEffect, useState } from 'react';
import { getQueuedWrites } from '../utils/offlineQueue';

export default function useQueuedWriteCount() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        getQueuedWrites().then((list) => setCount(list.length));
        const onChange = (e) => setCount(e.detail.count);
        window.addEventListener('offline-queue-changed', onChange);
        return () => window.removeEventListener('offline-queue-changed', onChange);
    }, []);

    return count;
}

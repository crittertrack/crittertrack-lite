import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';

// Unread count for the backend Notification model (transfer/breeder/parent requests,
// moderator messages, announcements, etc) — the "Requests" tab of the bell page. Reuses the
// same 'notifications-changed' event the care-alerts side already dispatches after actions.
export const useRequestCount = (authToken) => {
    const [count, setCount] = useState(0);

    const fetchCount = useCallback(async () => {
        if (!authToken) { setCount(0); return; }
        try {
            const { data } = await apiClient.get('/notifications/unread-count');
            setCount(data?.count || 0);
        } catch (err) {
            console.error('Failed to fetch request count:', err);
        }
    }, [authToken]);

    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 60000);
        window.addEventListener('notifications-changed', fetchCount);
        return () => {
            clearInterval(interval);
            window.removeEventListener('notifications-changed', fetchCount);
        };
    }, [fetchCount]);

    return count;
};

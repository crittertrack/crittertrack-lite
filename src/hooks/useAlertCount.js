import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

// Polls the same due-item counts shown on the Notifications page, for the bell icon badge.
// Also refetches immediately on a 'notifications-changed' event (dispatched after any
// mark-done/quick-action on the Notifications page, or when a push arrives in the foreground).
export const useAlertCount = (authToken) => {
    const [count, setCount] = useState(0);

    const fetchCount = useCallback(async () => {
        if (!authToken) { setCount(0); return; }
        try {
            const { data } = await axios.get(`${API_BASE_URL}/push/alert-count`, { headers: { Authorization: `Bearer ${authToken}` } });
            setCount(data?.total || 0);
        } catch (err) {
            console.error('Failed to fetch alert count:', err);
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

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';

// Sum of unreadCount across all conversations, for the messages icon badge. Refetches on the
// 'messages-changed' event dispatched by Messages/MessageThread after sending or reading.
export const useMessageUnreadCount = (authToken) => {
    const [count, setCount] = useState(0);

    const fetchCount = useCallback(async () => {
        if (!authToken) { setCount(0); return; }
        try {
            const { data } = await apiClient.get('/messages/conversations');
            const total = (Array.isArray(data) ? data : []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            setCount(total);
        } catch (err) {
            console.error('Failed to fetch message unread count:', err);
        }
    }, [authToken]);

    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        window.addEventListener('messages-changed', fetchCount);
        return () => {
            clearInterval(interval);
            window.removeEventListener('messages-changed', fetchCount);
        };
    }, [fetchCount]);

    return count;
};

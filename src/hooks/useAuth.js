import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

// Simplified version of crittertrack-frontend's useAppAuth — same backend/API, same
// localStorage keys, so a token created by the main app also works here (and vice versa).
export function useAuth() {
    const [authToken, setAuthToken] = useState(() => {
        try { return localStorage.getItem('authToken'); } catch { return null; }
    });
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async (token) => {
        if (!token) { setLoading(false); return; }
        try {
            const response = await axios.get(`${API_BASE_URL}/users/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserProfile(response.data || {});
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('authToken');
                setAuthToken(null);
                setUserProfile(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUserProfile(authToken); }, [authToken, fetchUserProfile]);

    const refreshProfile = useCallback(() => fetchUserProfile(authToken), [authToken, fetchUserProfile]);

    // Shared by login and registration (once a verification code completes the account) —
    // both just need to persist the resulting token and let fetchUserProfile pick it up.
    const completeAuth = useCallback((token) => {
        localStorage.setItem('authToken', token);
        setAuthToken(token);
    }, []);

    const login = useCallback(async (email, password) => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password, keepSignedIn: true });
        completeAuth(response.data.token);
        return response.data;
    }, [completeAuth]);

    const logout = useCallback(() => {
        localStorage.removeItem('authToken');
        setAuthToken(null);
        setUserProfile(null);
    }, []);

    return { authToken, userProfile, loading, login, logout, completeAuth, refreshProfile };
}

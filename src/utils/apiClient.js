// Central axios instance — attaches baseURL + auth header automatically so call sites
// don't need to repeat `${API_BASE_URL}` and `Authorization: Bearer ${authToken}` everywhere.
// Also the single choke point where network-status/offline detection hooks in (see
// useOnlineStatus.js), which scattered raw `axios` calls could never provide.
// Mirrors crittertrack-frontend/src/utils/apiClient.js — keep in sync.
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// A request that never reached the server (no `error.response`) means the network is
// down/unreachable, as opposed to the server responding with a 4xx/5xx. Broadcast that
// distinction globally so any component (e.g. useOnlineStatus) can react without every
// call site needing its own try/catch classification logic.
apiClient.interceptors.response.use(
    (response) => {
        window.dispatchEvent(new CustomEvent('api-network-status', { detail: { online: true } }));
        return response;
    },
    (error) => {
        if (!error.response) {
            window.dispatchEvent(new CustomEvent('api-network-status', { detail: { online: false } }));
        }
        return Promise.reject(error);
    }
);

export default apiClient;

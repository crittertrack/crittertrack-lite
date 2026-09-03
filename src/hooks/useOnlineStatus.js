// Tracks whether the app currently has a working connection to the API.
// On native (Capacitor Android), `navigator.onLine`/`online`/`offline` events are known to be
// unreliable in some Android WebView versions (can report "online" while on Wi-Fi with no real
// internet, or fail to fire at all), so we prefer the Capacitor Network plugin there — it talks
// to the OS's actual connectivity manager. On web/PWA we fall back to the browser APIs, combined
// with live signal from actual API calls via apiClient's response interceptor (a much more
// reliable indicator of "can we actually reach the backend" than either navigator.onLine or
// the OS-level connectivity state, since a device can have a network connection with no route
// to our specific server).
// Mirrors crittertrack-frontend/src/hooks/useOnlineStatus.js — keep in sync.
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

// A momentary blip (one failed request, a Wi-Fi handoff) shouldn't flash the offline banner —
// only treat the connection as actually down if it stays down this long. Coming back online is
// still reported instantly, no debounce needed for that direction.
const OFFLINE_DELAY_MS = 2000;

export default function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        let offlineTimer = null;
        const goOnline = () => {
            if (offlineTimer) { clearTimeout(offlineTimer); offlineTimer = null; }
            setIsOnline(true);
        };
        const goOffline = () => {
            if (offlineTimer) return;
            offlineTimer = setTimeout(() => { offlineTimer = null; setIsOnline(false); }, OFFLINE_DELAY_MS);
        };

        const onApiNetworkStatus = (e) => (e.detail.online ? goOnline() : goOffline());
        window.addEventListener('api-network-status', onApiNetworkStatus);

        if (Capacitor.isNativePlatform()) {
            let listenerHandle;
            Network.getStatus().then((status) => (status.connected ? goOnline() : goOffline()));
            Network.addListener('networkStatusChange', (status) => (status.connected ? goOnline() : goOffline()))
                .then((handle) => { listenerHandle = handle; });
            return () => {
                if (offlineTimer) clearTimeout(offlineTimer);
                window.removeEventListener('api-network-status', onApiNetworkStatus);
                listenerHandle?.remove();
            };
        }

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            if (offlineTimer) clearTimeout(offlineTimer);
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('api-network-status', onApiNetworkStatus);
        };
    }, []);

    return isOnline;
}

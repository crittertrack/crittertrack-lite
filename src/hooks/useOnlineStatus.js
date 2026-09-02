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

export default function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const onApiNetworkStatus = (e) => setIsOnline(e.detail.online);
        window.addEventListener('api-network-status', onApiNetworkStatus);

        if (Capacitor.isNativePlatform()) {
            let listenerHandle;
            Network.getStatus().then((status) => setIsOnline(status.connected));
            Network.addListener('networkStatusChange', (status) => setIsOnline(status.connected))
                .then((handle) => { listenerHandle = handle; });
            return () => {
                window.removeEventListener('api-network-status', onApiNetworkStatus);
                listenerHandle?.remove();
            };
        }

        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('api-network-status', onApiNetworkStatus);
        };
    }, []);

    return isOnline;
}

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const authHeaders = (authToken) => ({ headers: { Authorization: `Bearer ${authToken}` } });

// google-services.json is present and the backend has FIREBASE_SERVICE_ACCOUNT configured.
const FIREBASE_CONFIGURED = true;

// Requests permission (if needed) and asks the OS to register this device for FCM push —
// the actual token arrives asynchronously via the 'registration' listener below.
export const registerNativePush = async () => {
    if (!Capacitor.isNativePlatform() || !FIREBASE_CONFIGURED) return;
    try {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
            perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted') return;
        await PushNotifications.register();
    } catch (err) {
        console.error('[push] Native registration failed:', err);
    }
};

// Wires up the FCM listeners for this authenticated session. Returns a cleanup function that
// removes all listeners (call it on logout/unmount). Navigation on tap uses a full location
// change since the app uses HashRouter natively — a plain assignment re-triggers routing.
export const initNativePushListeners = async (authToken) => {
    if (!Capacitor.isNativePlatform()) return () => {};

    const handles = await Promise.all([
        PushNotifications.addListener('registration', async (token) => {
            try {
                await axios.post(`${API_BASE_URL}/push/register-device`, { token: token.value, platform: 'android' }, authHeaders(authToken));
            } catch (err) {
                console.error('[push] Failed to register device token with backend:', err);
            }
        }),
        PushNotifications.addListener('registrationError', (err) => {
            console.error('[push] Registration error:', err);
        }),
        PushNotifications.addListener('pushNotificationReceived', () => {
            window.dispatchEvent(new Event('notifications-changed'));
        }),
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const url = action.notification?.data?.url;
            if (url) window.location.hash = url;
        }),
    ]);

    return () => handles.forEach((h) => h.remove());
};

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// target="_blank"/window.open do nothing useful inside a Capacitor Android WebView
// (there's no browser chrome to open a new tab in) — route external links through the
// system browser there instead.
export const openExternalLink = (url) => {
    if (!url) return;
    if (Capacitor.isNativePlatform()) {
        Browser.open({ url });
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
};

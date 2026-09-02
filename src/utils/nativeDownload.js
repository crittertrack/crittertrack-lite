import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

// Clicking an <a download> link is silently a no-op in the Android WebView used by Capacitor
// (no download manager is attached to it), so pedigree PDF/image exports never actually save
// anything there. On native, write the file to the app's cache dir instead and hand it to the
// OS share sheet (lets the user save it to Downloads, Drive, etc). Web keeps the exact original
// anchor-click download behavior. Mirrors crittertrack-frontend's utils/nativeDownload.js.
export const downloadBlob = async (blob, filename) => {
    if (!Capacitor.isNativePlatform()) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    const base64Data = await blobToBase64(blob);
    const { uri } = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
    });
    await Share.share({ url: uri });
};

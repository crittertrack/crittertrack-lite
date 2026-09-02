import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crittertrack.lite',
  appName: 'CritterTrack Lite',
  webDir: 'build',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#D27096',
    },
  },
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cbd25e4a769a42d6835afcaa159bbcc4',
  appName: 'AuroPay',
  webDir: 'dist',
  server: {
    url: 'https://cbd25e4a-769a-42d6-835a-fcaa159bbcc4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    backgroundColor: '#0a0c0f',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0a0c0f',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#0a0c0f',
    },
  },
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

/**
 * AuroPay — Capacitor configuration
 *
 * IMPORTANT for production APK builds:
 *  - Comment out (or delete) the entire `server` block before running
 *    `npm run build && npx cap sync android && npx cap open android`.
 *    The `server.url` is only used during development to live-reload from
 *    the Lovable sandbox. A production APK must bundle and serve the local
 *    `dist/` build (webDir).
 *  - After commenting out `server`, run `npm run build` then `npx cap sync`.
 *
 * Deep links (Android App Links):
 *  - Custom scheme:  auropay://...
 *  - HTTPS:          https://auro-pay.lovable.app/...
 *  Both intent filters are configured in
 *  android/app/src/main/AndroidManifest.xml after `npx cap add android`.
 *  See DEEP_LINKS.md in the project root for setup details.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.cbd25e4a769a42d6835afcaa159bbcc4',
  appName: 'AuroPay',
  webDir: 'dist',

  // ⚠️ DEV ONLY — remove for production APK release builds
  server: {
    url: 'https://cbd25e4a-769a-42d6-835a-fcaa159bbcc4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },

  android: {
    backgroundColor: '#0a0c0f',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: '#0a0c0f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0c0f',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Haptics: {},
    App: {
      // Used to whitelist the deep link schemes Android can open
      launchUrl: 'auropay://',
    },
  },
};

export default config;

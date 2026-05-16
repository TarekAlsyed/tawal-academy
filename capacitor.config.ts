import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tawal.academy',
  appName: 'Tawal Academy',
  webDir: 'dist',
  
  // Android-specific settings
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // ✅ Disabled for production (enable only for USB debugging)
  },

  plugins: {
    // Native HTTP — Routes all fetch/XHR through native layer (OkHttp)
    // This BYPASSES CORS entirely — critical for mobile → external API communication
    CapacitorHttp: {
      enabled: true,
    },

    // Splash Screen Configuration
    // ⚡ Keep splash short — app shows cached UI instantly
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#0c0f1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'large',
      spinnerColor: '#6366f1',
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Status Bar Configuration
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c0f1a',
    },

    // Keyboard Configuration
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },

    // Native Cookie handling
    CapacitorCookies: {
      enabled: true,
    },
  },

  // Server configuration — uncomment for local dev testing
  // server: {
  //   url: 'http://192.168.1.X:5173', // Replace with your local IP
  //   cleartext: true,
  // },
};

export default config;

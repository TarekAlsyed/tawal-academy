/**
 * Capacitor Native Bridge
 * Handles platform-specific behavior for Android/iOS
 * Falls back gracefully to web behavior when running in browser
 */

import { Capacitor } from '@capacitor/core';

// ============================================
// Platform Detection
// ============================================
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
export const isAndroid = () => getPlatform() === 'android';
export const isIOS = () => getPlatform() === 'ios';
export const isWeb = () => getPlatform() === 'web';

// ============================================
// Status Bar (Android)
// ============================================
export const configureStatusBar = async (isDarkMode = true) => {
  if (!isNativePlatform()) return;
  
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    
    await StatusBar.setStyle({ 
      style: isDarkMode ? Style.Dark : Style.Light 
    });
    
    await StatusBar.setBackgroundColor({ 
      color: isDarkMode ? '#0c0f1a' : '#f0f4f8' 
    });
  } catch (e) {
    console.warn('[NativeBridge] StatusBar not available:', e.message);
  }
};

// ============================================
// Keyboard (Android)
// ============================================
export const setupKeyboard = async () => {
  if (!isNativePlatform()) return;
  
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-visible');
    });
    
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-visible');
    });
  } catch (e) {
    console.warn('[NativeBridge] Keyboard not available:', e.message);
  }
};

// ============================================
// Back Button (Android)
// ============================================
export const setupBackButton = async (navigateBack) => {
  if (!isNativePlatform()) return;
  
  try {
    const { App } = await import('@capacitor/app');
    
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // If on the home page, minimize the app instead of closing
        App.minimizeApp();
      }
    });
  } catch (e) {
    console.warn('[NativeBridge] App plugin not available:', e.message);
  }
};

// ============================================
// App State (Foreground/Background)
// ============================================
export const setupAppStateListener = async (onResume, onPause) => {
  if (!isNativePlatform()) return;
  
  try {
    const { App } = await import('@capacitor/app');
    
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && onResume) {
        onResume();
      } else if (!isActive && onPause) {
        onPause();
      }
    });
  } catch (e) {
    console.warn('[NativeBridge] App state listener not available:', e.message);
  }
};

// ============================================
// Network Status
// ============================================
export const getNetworkStatus = async () => {
  if (!isNativePlatform()) {
    return { connected: navigator.onLine, connectionType: 'unknown' };
  }
  
  try {
    const { Network } = await import('@capacitor/network');
    return await Network.getStatus();
  } catch (e) {
    return { connected: navigator.onLine, connectionType: 'unknown' };
  }
};

export const onNetworkChange = async (callback) => {
  if (!isNativePlatform()) {
    // Fallback to web events
    window.addEventListener('online', () => callback({ connected: true }));
    window.addEventListener('offline', () => callback({ connected: false }));
    return;
  }
  
  try {
    const { Network } = await import('@capacitor/network');
    Network.addListener('networkStatusChange', callback);
  } catch (e) {
    console.warn('[NativeBridge] Network plugin not available:', e.message);
  }
};

// ============================================
// Splash Screen
// ============================================
export const hideSplashScreen = async () => {
  if (!isNativePlatform()) return;
  
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('[NativeBridge] SplashScreen not available:', e.message);
  }
};

// ============================================
// File Download (for PDFs)
// ============================================
export const downloadFile = async (url, filename) => {
  if (!isNativePlatform()) {
    // Web fallback: open in new tab
    window.open(url, '_blank');
    return;
  }
  
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    
    // Fetch the file as blob
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    
    // Convert blob to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the data:...;base64, prefix
        const result = reader.result;
        const base64Data = result.substring(result.indexOf(',') + 1);
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9._\u0600-\u06FF\- ]/g, '_');
    
    // Write to Documents directory
    const savedFile = await Filesystem.writeFile({
      path: safeName,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    
    console.log(`[NativeBridge] File saved to: ${savedFile.uri}`);
    
    // Try to open the saved file
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: savedFile.uri });
    } catch {
      // Browser plugin failed — file is saved, user can find it in Documents
      console.log('[NativeBridge] File saved to Documents folder');
    }
    
    return savedFile.uri;
  } catch (e) {
    console.warn('[NativeBridge] File download failed, opening in browser:', e.message);
    // Fallback: open in external browser
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch {
      window.open(url, '_blank');
    }
  }
};

// ============================================
// Open External Link
// ============================================
export const openExternalLink = async (url) => {
  if (!isNativePlatform()) {
    window.open(url, '_blank');
    return;
  }
  
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } catch (e) {
    window.open(url, '_blank');
  }
};

// ============================================
// Haptic Feedback
// ============================================
export const hapticFeedback = async (style = 'Light') => {
  if (!isNativePlatform()) return;
  
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style] || ImpactStyle.Light });
  } catch (e) {
    // Silently fail — haptics are optional
  }
};

// ============================================
// Initialize All Native Features
// ============================================
export const initializeNativeBridge = async () => {
  if (!isNativePlatform()) {
    console.log('[NativeBridge] Running on web — skipping native initialization');
    return;
  }
  
  console.log(`[NativeBridge] Initializing for platform: ${getPlatform()}`);
  
  // Initialize all native features
  await configureStatusBar(true); // Default to dark mode
  await setupKeyboard();
  await setupBackButton();
  
  // Hide splash screen after app is loaded
  await hideSplashScreen();
  
  // Setup app state listener for session management
  await setupAppStateListener(
    () => console.log('[NativeBridge] App resumed'),
    () => console.log('[NativeBridge] App paused')
  );
  
  console.log('[NativeBridge] Native initialization complete ✅');
};

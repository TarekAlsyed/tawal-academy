import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Register Service Worker for PWA (web only — disabled in Capacitor builds)
// Uses dynamic import to avoid build errors when vite-plugin-pwa is not active
const registerPWA = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) return; // Skip SW on native apps
  } catch {
    // @capacitor/core not available — we're on web, continue
  }

  if ('serviceWorker' in navigator) {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        onNeedRefresh() {
          if (confirm('تحديث جديد متاح للمنصة، هل تريد التحديث الآن؟')) {
            window.location.reload();
          }
        },
        onOfflineReady() {
          console.log('المنصة جاهزة للعمل في وضع الأوفلاين!');
        },
      });
    } catch {
      // PWA plugin not available (Capacitor build) — skip silently
    }
  }
};
registerPWA();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

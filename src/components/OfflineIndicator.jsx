import React, { useState, useEffect } from 'react';
import { FiWifiOff } from 'react-icons/fi';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '50px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
      fontWeight: 'bold',
      direction: 'rtl'
    }}>
      <FiWifiOff size={20} />
      <span>أنت تعمل الآن في وضع الأوفلاين - يمكنك تصفح الملفات المحملة مسبقاً</span>
    </div>
  );
};

export default OfflineIndicator;
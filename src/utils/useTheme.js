import { useState, useEffect } from 'react';

/**
 * Custom hook for theme awareness in components with inline styles.
 * Watches body.classList for 'light-mode' class changes.
 * Returns isLight boolean and a color palette object.
 */
export const useTheme = () => {
  const [isLight, setIsLight] = useState(document.body.classList.contains('light-mode'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.body.classList.contains('light-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Dynamic color palette
  const colors = {
    // Page backgrounds
    pageBg: isLight ? '#f0f7ff' : '#0f172a',
    
    // Header
    headerBg: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.8)',
    headerBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
    
    // Card surfaces
    cardBg: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.03)',
    cardBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
    cardHoverBorder: isLight ? 'rgba(147,197,253,0.8)' : 'rgba(255,255,255,0.12)',
    
    // Glass card (login, modals)
    glassBg: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.7)',
    glassBorder: isLight ? '1px solid rgba(226,232,240,0.8)' : '1px solid rgba(255,255,255,0.1)',
    glassShadow: isLight
      ? '0 20px 60px rgba(37,99,235,0.08), 0 0 0 1px rgba(226,232,240,0.5)'
      : '0 0 80px rgba(59,130,246,0.1), 0 0 40px rgba(139,92,246,0.08)',
    
    // Subtle backgrounds
    subtleBg: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(255,255,255,0.05)',
    elevatedBg: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)',
    
    // Text
    textPrimary: isLight ? '#1e293b' : '#f1f5f9',
    textSecondary: isLight ? '#475569' : '#94a3b8',
    textMuted: isLight ? '#94a3b8' : '#64748b',
    textLabel: isLight ? '#1e293b' : '#e2e8f0',
    
    // Hero/accent text
    heroTitle: isLight ? '#1e293b' : '#f1f5f9',
    heroSubtitle: isLight ? '#64748b' : '#94a3b8',
    
    // Mesh gradient
    meshGradient: isLight
      ? 'radial-gradient(at 30% 30%, #93c5fd 0, transparent 50%), radial-gradient(at 70% 70%, #86efac 0, transparent 50%), radial-gradient(at 50% 50%, #c4b5fd 0, transparent 60%)'
      : 'radial-gradient(at 30% 30%, #3b82f6 0, transparent 50%), radial-gradient(at 70% 70%, #f43f5e 0, transparent 50%), radial-gradient(at 50% 50%, #8b5cf6 0, transparent 60%)',
    meshOpacity: isLight ? 0.3 : 0.4,
    
    // Grid dots
    gridDot: isLight ? 'rgba(37,99,235,0.03)' : 'rgba(255,255,255,0.05)',
    
    // Borders
    border: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)',
    borderLight: isLight ? 'rgba(226,232,240,0.5)' : 'rgba(255,255,255,0.06)',
    
    // Badge/chip backgrounds
    badgeBg: isLight ? 'rgba(37,99,235,0.08)' : 'rgba(59,130,246,0.15)',
    badgeColor: isLight ? '#2563eb' : '#60a5fa',
    badgeBorder: isLight ? '1px solid rgba(37,99,235,0.15)' : '1px solid rgba(59,130,246,0.2)',
    
    // Loading spinner
    spinnerBorder: isLight ? '3px solid #e2e8f0' : '3px solid rgba(255,255,255,0.1)',
    spinnerColor: '#3b82f6',
    
    // Empty state
    emptyBg: isLight ? 'rgba(241,245,249,0.5)' : 'rgba(255,255,255,0.03)',
    emptyBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
    emptyIcon: isLight ? '#94a3b8' : '#475569',
    
    // Inputs
    inputBg: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(255,255,255,0.05)',
    inputBorder: isLight ? '1.5px solid #e2e8f0' : '1.5px solid rgba(255,255,255,0.1)',
    inputColor: isLight ? '#1e293b' : '#f1f5f9',
    
    // Logout button
    logoutBg: isLight ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.1)',
    logoutColor: isLight ? '#dc2626' : '#f87171',
    logoutBorder: isLight ? '1px solid rgba(239,68,68,0.12)' : '1px solid rgba(239,68,68,0.15)',
    
    // Icon label colors
    labelIcon1: isLight ? '#2563eb' : '#60a5fa',
    labelIcon2: isLight ? '#7c3aed' : '#a78bfa',
  };

  return { isLight, colors };
};

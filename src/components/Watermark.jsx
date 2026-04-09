import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Advanced Dynamic Watermark Component (SVG Pattern Version)
 * Covers 100% of the screen with a dense, high-contrast repeating pattern.
 * Visible on both dark and light backgrounds.
 */
const Watermark = () => {
  const { user, admin, isAuthenticated, isAdminAuthenticated } = useAuth();
  
  if (!isAuthenticated && !isAdminAuthenticated) return null;
  
  const displayInfo = user ? `${user.name} | ID: ${user.id}` : (admin ? `Admin: ${admin.name}` : 'Tawal Academy');
  const timestamp = new Date().toLocaleDateString('ar-EG');
  const fullText = `${displayInfo} | ${timestamp}`;

  // Create a high-contrast SVG background pattern
  const svgPattern = useMemo(() => {
    const encodedText = encodeURIComponent(fullText);
    // Increased visibility and density for maximum security
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
      <text 
        x="50%" 
        y="50%" 
        fill="rgba(0,0,0,0.25)" 
        stroke="rgba(255,255,255,0.4)" 
        stroke-width="0.5"
        font-family="Arial, sans-serif" 
        font-size="16" 
        font-weight="bold" 
        text-anchor="middle" 
        transform="rotate(-25, 150, 100)"
      >
        ${encodedText}
      </text>
    </svg>`;
  }, [fullText]);

  return (
    <div className="security-watermark-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 2147483647,
      overflow: 'hidden',
      backgroundImage: `url('${svgPattern}')`,
      backgroundRepeat: 'repeat',
      backgroundSize: '200px 130px', // Even more dense
      userSelect: 'none',
      opacity: 1
    }}>
      <style>{`
        .security-watermark-overlay {
          pointer-events: none !important;
        }
        @media print {
          .security-watermark-overlay {
            opacity: 0.5 !important;
          }
        }
        /* Stay on top of full-screen elements and all stacking contexts */
        :fullscreen .security-watermark-overlay,
        :-webkit-full-screen .security-watermark-overlay,
        :-ms-fullscreen .security-watermark-overlay {
          z-index: 2147483647 !important;
          display: block !important;
        }
      `}</style>
    </div>
  );
};

export default Watermark;

import CryptoJS from 'crypto-js';

/**
 * Advanced Device Fingerprinting Utility
 * Generates a unique, stable hash based on browser and hardware characteristics.
 */
export const generateFingerprint = () => {
  try {
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      window.screen.width + 'x' + window.screen.height,
      window.screen.colorDepth,
      navigator.hardwareConcurrency || 'unknown',
      navigator.deviceMemory || 'unknown',
      navigator.platform,
      // Attempt to get canvas fingerprint
      getCanvasFingerprint()
    ];

    const rawString = components.join('|');
    return CryptoJS.SHA256(rawString).toString(CryptoJS.enc.Hex);
  } catch (e) {
    console.error('Fingerprinting failed, using fallback:', e);
    // Fallback to a simpler unique ID if something fails
    // We generate a one-time ID for this session instead of storing in localStorage
    return `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 20;
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("TawalAcademy,🔒🛡️", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("TawalAcademy,🔒🛡️", 4, 17);
    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-blocked';
  }
};

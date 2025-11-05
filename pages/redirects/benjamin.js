import { useEffect } from 'react';

export default function BenjaminRedirect() {
  useEffect(() => {
    // Simple tracking - just log the scan
    console.log('QR code scanned - Benjamin redirect accessed');
    
    // Immediate redirect
    window.location.href = 'https://brakebee.com';
  }, []);

  return null;
}

import { useEffect } from 'react';

export default function JillRedirect() {
  useEffect(() => {
    // Simple tracking - just log the scan
    console.log('QR code scanned - Jill redirect accessed');
    
    // Immediate redirect
    window.location.href = 'https://brakebee.com';
  }, []);

  return null;
}

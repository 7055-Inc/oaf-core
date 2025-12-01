import { useEffect } from 'react';

export default function FH25Redirect() {
  useEffect(() => {
    // Simple tracking - just log the scan
    console.log('QR code scanned - FH25 redirect accessed');
    
    // Immediate redirect
    window.location.href = 'https://brakebee.com/events/714?token=M4N26W';
  }, []);

  return null;
}


import '../styles/global.css';
import { useEffect } from 'react';

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('../lib/imageProtection').then(({ initImageProtection }) => {
      initImageProtection();
    });
  }, []);

  return <Component {...pageProps} />;
}
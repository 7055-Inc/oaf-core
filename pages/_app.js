import '../styles/global.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '../components/layouts';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('../lib/imageProtection').then(({ initImageProtection }) => {
      initImageProtection();
    });
  }, []);

  // Dashboard pages: leave alone (they handle their own layout)
  if (router.pathname.startsWith('/dashboard')) {
    return <Component {...pageProps} />;
  }

  // All other pages: wrap with MainLayout (persistent Header + Footer)
  return (
    <MainLayout>
      <Component {...pageProps} />
    </MainLayout>
  );
}

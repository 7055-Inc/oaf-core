import '../styles/global.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { MainLayout } from '../components/layouts';
import CookieBanner, { hasFullCookieConsent } from '../components/CookieBanner';
import WelcomeBanner from '../components/WelcomeBanner';

// Google Tag Manager ID
const GTM_ID = 'GTM-P2CLNXVS';

// Load GTM only when user has accepted all cookies
function loadGTM() {
  if (typeof window === 'undefined') return;
  if (window.gtmLoaded) return; // Prevent duplicate loading
  
  window.gtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  });
  
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

// Default SEO - pages can override with their own Head
const DEFAULT_SEO = {
  title: 'Brakebee - Discover & Support Independent Artists',
  description: 'Brakebee connects art lovers with independent artists. Discover unique artwork, attend live events, and support creators directly.',
  url: 'https://brakebee.com',
};

// Site-wide Schema.org structured data
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Brakebee",
  "alternateName": "Brakebee Arts",
  "url": "https://brakebee.com",
  "logo": "https://brakebee.com/static_media/brakebee-logo.png",
  "description": "Brakebee connects art lovers with independent artists. Discover unique artwork, attend live events, and support creators directly.",
  "sameAs": [
    "https://www.facebook.com/BrakebeeArt",
    "https://www.instagram.com/brakebeeart/",
    "https://www.pinterest.com/brakebee/",
    "https://www.tiktok.com/@brakebeeart",
    "https://www.youtube.com/channel/UCTQqOy9dgVgVOBai7Wc88ng",
    "https://x.com/BrakebeeArt"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "url": "https://brakebee.com/contact"
  }
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Brakebee",
  "url": "https://brakebee.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://brakebee.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('../lib/imageProtection').then(({ initImageProtection }) => {
      initImageProtection();
    });
    
    // Load GTM if user has already accepted all cookies
    if (hasFullCookieConsent()) {
      loadGTM();
    }
    
    // Listen for cookie consent changes
    const handleConsent = (e) => {
      if (e.detail?.level === 'all') {
        loadGTM();
      }
    };
    
    window.addEventListener('cookieConsent', handleConsent);
    return () => window.removeEventListener('cookieConsent', handleConsent);
  }, []);

  // Pages with their own layouts: leave alone (they handle their own header/footer)
  if (router.pathname.startsWith('/dashboard') || 
      router.pathname.startsWith('/makers') || 
      router.pathname.startsWith('/promoter') ||
      router.pathname.startsWith('/artist-storefront') ||
      router.pathname.startsWith('/custom-sites')) {
    return (
      <>
        <Component {...pageProps} />
        <CookieBanner />
        <WelcomeBanner />
      </>
    );
  }

  // Build canonical URL - only set for static pages
  // Dynamic pages (containing [param]) should set their own canonical with resolved IDs
  const isDynamicRoute = router.pathname.includes('[');
  const canonicalPath = router.asPath.split('?')[0]; // Remove query params
  const canonicalUrl = !isDynamicRoute ? DEFAULT_SEO.url + canonicalPath : null;
  
  // Don't set default meta description for dynamic routes - they set their own
  const useDefaultMeta = !isDynamicRoute;

  // All other pages: wrap with MainLayout (persistent Header + Footer)
  return (
    <>
      {/* Default SEO - individual pages can override */}
      <Head>
        {useDefaultMeta && <title key="title">{DEFAULT_SEO.title}</title>}
        {useDefaultMeta && <meta key="description" name="description" content={DEFAULT_SEO.description} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {useDefaultMeta && <meta key="og:title" property="og:title" content={DEFAULT_SEO.title} />}
        {useDefaultMeta && <meta key="og:description" property="og:description" content={DEFAULT_SEO.description} />}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={DEFAULT_SEO.url} />
        <meta property="og:image" content="https://brakebee.com/static_media/brakebee-logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        
        {/* Site-wide Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
        
        {/* WebSite Schema with SearchAction for Google Sitelinks Search Box */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
        />
      </Head>
      <MainLayout>
        <Component {...pageProps} />
      </MainLayout>
      <CookieBanner />
      <WelcomeBanner />
    </>
  );
}

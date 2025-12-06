import '../styles/global.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { MainLayout } from '../components/layouts';

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
    "https://www.facebook.com/brakebee",
    "https://www.instagram.com/brakebee",
    "https://twitter.com/brakebee"
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
  }, []);

  // Dashboard pages: leave alone (they handle their own layout)
  if (router.pathname.startsWith('/dashboard')) {
    return <Component {...pageProps} />;
  }

  // All other pages: wrap with MainLayout (persistent Header + Footer)
  return (
    <>
      {/* Default SEO - individual pages can override */}
      <Head>
        <title>{DEFAULT_SEO.title}</title>
        <meta name="description" content={DEFAULT_SEO.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={DEFAULT_SEO.title} />
        <meta property="og:description" content={DEFAULT_SEO.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={DEFAULT_SEO.url} />
        <meta property="og:image" content="https://brakebee.com/static_media/brakebee-logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={DEFAULT_SEO.url + router.asPath} />
        
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
    </>
  );
}

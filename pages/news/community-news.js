import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NewsMagazine from '../../components/news/NewsMagazine';
import { getApiUrl, getFrontendUrl } from '../../lib/config';

// Page-specific configuration
const PAGE_CONFIG = {
  section: 'community-news',
  title: 'Community News',
  subtitle: 'Discover Art, Events & Trends',
  description: 'Your guide to discovering amazing art, finding local events, collecting tips, and staying connected with the creative community.',
  defaultCategory: 'Community',
  categories: [
    {
      name: 'Event Discovery',
      icon: 'fas fa-search-location',
      description: 'Find amazing art events near you'
    },
    {
      name: 'Collecting Tips',
      icon: 'fas fa-gem',
      description: 'Build your art collection wisely'
    },
    {
      name: 'Artist Spotlights',
      icon: 'fas fa-star',
      description: 'Meet talented creators'
    },
    {
      name: 'Trends',
      icon: 'fas fa-chart-line',
      description: 'What\'s hot in the art world'
    }
  ]
};

export default function CommunityNewsPage({ featuredArticles, latestArticles, pagination }) {
  return (
    <>
      <Head>
        <title>{PAGE_CONFIG.title} - {PAGE_CONFIG.subtitle} | Brakebee</title>
        <meta name="description" content={PAGE_CONFIG.description} />
        <meta name="keywords" content="art events, art collecting, artist spotlights, art trends, art community, local art events" />
        <link rel="canonical" href={getFrontendUrl('/news/community-news')} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${PAGE_CONFIG.title} - ${PAGE_CONFIG.subtitle}`} />
        <meta property="og:description" content={PAGE_CONFIG.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getFrontendUrl('/news/community-news')} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${PAGE_CONFIG.title} - ${PAGE_CONFIG.subtitle}`} />
        <meta name="twitter:description" content={PAGE_CONFIG.description} />
      </Head>

      <Header />
      
      <main style={{ paddingTop: 'var(--header-height-desktop, 80px)' }}>
        {/* Page Header */}
        <div style={{ 
          background: 'var(--gradient-primary)', 
          padding: '3rem 1.5rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: '2.5rem', 
            margin: '0 0 0.5rem 0',
            color: 'white'
          }}>
            {PAGE_CONFIG.title}
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            margin: 0, 
            opacity: 0.9,
            maxWidth: '600px',
            marginInline: 'auto'
          }}>
            {PAGE_CONFIG.subtitle}
          </p>
        </div>

        <NewsMagazine
          section={PAGE_CONFIG.section}
          config={PAGE_CONFIG}
          featuredArticles={featuredArticles}
          latestArticles={latestArticles}
          pagination={pagination}
        />
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps({ query }) {
  const page = parseInt(query.page) || 1;
  const limit = 9;
  const featuredLimit = 5;

  try {
    // Fetch featured articles (most recent for slider)
    const featuredResponse = await fetch(
      getApiUrl(`api/articles?section=${PAGE_CONFIG.section}&status=published&limit=${featuredLimit}&page=1`)
    );
    const featuredData = featuredResponse.ok ? await featuredResponse.json() : { articles: [] };

    // Fetch latest articles for grid
    const latestResponse = await fetch(
      getApiUrl(`api/articles?section=${PAGE_CONFIG.section}&status=published&limit=${limit}&page=${page}`)
    );
    const latestData = latestResponse.ok ? await latestResponse.json() : { articles: [], pagination: {} };

    return {
      props: {
        featuredArticles: featuredData.articles || [],
        latestArticles: latestData.articles || [],
        pagination: {
          page,
          limit,
          total: latestData.pagination?.total || 0
        }
      }
    };
  } catch (error) {
    return {
      props: {
        featuredArticles: [],
        latestArticles: [],
        pagination: { page: 1, limit: 9, total: 0 }
      }
    };
  }
}


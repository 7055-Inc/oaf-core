import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NewsMagazine from '../../components/news/NewsMagazine';
import { getApiUrl, getFrontendUrl } from '../../lib/config';

// Page-specific configuration
const PAGE_CONFIG = {
  section: 'artist-news',
  title: 'Artist News',
  subtitle: 'Tips, Guides & Inspiration for Artists',
  description: 'Stay updated with the latest tips, selling guides, event preparation advice, and inspiration for artists. Your go-to resource for growing your art business.',
  defaultCategory: 'Artist Tips',
  categories: [
    {
      name: 'Selling Tips',
      icon: 'fas fa-dollar-sign',
      description: 'Boost your sales with proven strategies'
    },
    {
      name: 'Event Prep',
      icon: 'fas fa-calendar-check',
      description: 'Get ready for your next show'
    },
    {
      name: 'Marketing',
      icon: 'fas fa-bullhorn',
      description: 'Grow your audience and brand'
    },
    {
      name: 'Business',
      icon: 'fas fa-briefcase',
      description: 'Run your art business smarter'
    }
  ]
};

export default function ArtistNewsPage({ featuredArticles, latestArticles, pagination }) {
  return (
    <>
      <Head>
        <title>{PAGE_CONFIG.title} - {PAGE_CONFIG.subtitle} | Brakebee</title>
        <meta name="description" content={PAGE_CONFIG.description} />
        <meta name="keywords" content="artist tips, selling art, art business, event preparation, art marketing, artist resources" />
        <link rel="canonical" href={getFrontendUrl('/news/artist-news')} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${PAGE_CONFIG.title} - ${PAGE_CONFIG.subtitle}`} />
        <meta property="og:description" content={PAGE_CONFIG.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getFrontendUrl('/news/artist-news')} />
        
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

    // Fetch latest articles for grid (skip featured ones if same query)
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

